import path from "node:path";
import fs from "node:fs/promises";
import {EventEmitter} from "node:events";
import os from "node-os-utils";
import si from "systeminformation";
import PowerShell from "powershell";
import {SETTINGS_VERSION} from "../../app.js";
import MovingAverage from "../utils/MovingAverage.js";
import ProcessMonitor from "../utils/ProcessMonitor.js";
import ActivityLogger from "../utils/ActivityLogger.js";
import WebInterface from "../web/WebInterface.js";
import WindowsNotifier from "../utils/WindowsNotifier.js";

const cpu = os.cpu;

class SystemMonitor extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.cpuAverage = new MovingAverage(config.moving_average_window || 12);
        this.networkTxAverage = new MovingAverage(config.moving_average_window || 12);
        this.networkRxAverage = new MovingAverage(config.moving_average_window || 12);
        this.diskReadAverage = new MovingAverage(config.moving_average_window || 12);
        this.diskWriteAverage = new MovingAverage(config.moving_average_window || 12);
        this.memoryAverage = new MovingAverage(config.moving_average_window || 12);

        this.isMonitoring = false;
        this.intervals = {};
        this.shutdownTriggerCount = 0;
        this.isShutdownPending = false;
        this.lastDiskStats = null;
        this.lastNetworkStats = null;

        this.processMonitor = new ProcessMonitor();
        this.activityLogger = new ActivityLogger(config.max_log_entries || 1000);
        this.webInterface = new WebInterface(this, config.web_port || 8080);

        this.startTime = new Date();
        this.shutdownEvents = 0;
        this.totalEnergySaved = 0;
    }

    start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.emit('started');

        // Start web interface if enabled
        if (this.config.enable_web_interface) {
            this.webInterface.start();
        }

        // Collect system data every second
        this.intervals.dataCollection = setInterval(() => {
            this.collectSystemData();
        }, 1000);

        // Update process list every 5 seconds
        this.intervals.processUpdate = setInterval(() => {
            this.updateProcesses();
        }, 5000);

        // Check shutdown conditions at configured interval
        this.intervals.shutdownCheck = setInterval(() => {
            this.checkShutdownConditions();
        }, this.config.trigger_interval * 1000);

        // Reset averages periodically
        this.intervals.averageReset = setInterval(() => {
            this.resetAverages();
        }, this.config.average_interval_reset * 1000);

        // Save logs periodically
        this.intervals.logSave = setInterval(() => {
            this.saveLogs();
        }, this.config.log_save_interval * 1000 || 300000); // 5 minutes default
    }

    stop() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        this.webInterface.stop();
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        this.intervals = {};
        this.emit('stopped');
    }

    async collectSystemData() {
        try {
            const startTime = Date.now();

            // Collect CPU usage
            const cpuUsage = await cpu.usage();
            this.cpuAverage.add(cpuUsage);

            // Collect memory usage
            const memInfo = await si.mem();
            const memoryUsagePercent = (memInfo.used / memInfo.total) * 100;
            this.memoryAverage.add(memoryUsagePercent);

            // Collect network stats
            const networkStats = await si.networkStats();
            if (networkStats && networkStats.length > 0) {
                const primaryInterface = networkStats.find(stat =>
                    stat.iface && !stat.iface.toLowerCase().includes('loopback')
                ) || networkStats[0];

                const txMbps = (primaryInterface.tx_sec || 0) * 8e-6;
                const rxMbps = (primaryInterface.rx_sec || 0) * 8e-6;

                this.networkTxAverage.add(txMbps);
                this.networkRxAverage.add(rxMbps);

                this.lastNetworkStats = {
                    tx: txMbps,
                    rx: rxMbps,
                    interface: primaryInterface.iface
                };
            }

            // Collect disk I/O stats
            const diskStats = await si.disksIO();
            if (diskStats) {
                const readMBps = (diskStats.rIO_sec || 0) / (1024 * 1024);
                const writeMBps = (diskStats.wIO_sec || 0) / (1024 * 1024);

                this.diskReadAverage.add(readMBps);
                this.diskWriteAverage.add(writeMBps);

                this.lastDiskStats = {
                    read: readMBps,
                    write: writeMBps
                };
            }

            // Log the data
            this.activityLogger.log('system_stats', {
                cpu: cpuUsage,
                networkTx: this.lastNetworkStats?.tx || 0,
                networkRx: this.lastNetworkStats?.rx || 0,
                diskRead: this.lastDiskStats?.read || 0,
                diskWrite: this.lastDiskStats?.write || 0,
                memoryUsed: memoryUsagePercent,
                collectionTime: Date.now() - startTime
            });

        } catch (error) {
            this.emit('error', `Data collection error: ${error.message}`);
        }
    }

    async updateProcesses() {
        try {
            await this.processMonitor.updateProcessList();
        } catch (error) {
            this.emit('error', `Process update error: ${error.message}`);
        }
    }

    async checkShutdownConditions() {
        if (!this.cpuAverage.hasEnoughData()) return;

        const stats = this.getCurrentStats();
        this.emit('stats', stats);

        // Check if we're in a blackout period
        if (this.isInBlackoutPeriod()) {
            if (this.shutdownTriggerCount > 0) {
                this.shutdownTriggerCount = 0;
                this.emit('blackout-period', 'Shutdown cancelled due to blackout period');
                await WindowsNotifier.showNotification(
                    'Shutdown Cancelled',
                    'Currently in blackout period - no shutdowns allowed',
                    'info'
                );
            }
            return;
        }

        // Enhanced conditions check
        const meetsBasicConditions = this.checkBasicConditions(stats);
        const meetsAdvancedConditions = await this.checkAdvancedConditions();
        const meetsProcessConditions = this.checkProcessConditions();

        const shouldTriggerShutdown = meetsBasicConditions && meetsAdvancedConditions && meetsProcessConditions;

        if (shouldTriggerShutdown && !this.isShutdownPending) {
            this.shutdownTriggerCount++;

            const remainingTime = (this.config.trigger_shutdown_times - this.shutdownTriggerCount) * this.config.trigger_interval;

            const warningData = {
                count: this.shutdownTriggerCount,
                maxCount: this.config.trigger_shutdown_times,
                remainingTime: remainingTime,
                stats: stats,
                reason: 'Low system activity detected'
            };

            this.emit('shutdown-warning', warningData);

            // Show Windows notification for warnings
            if (this.shutdownTriggerCount === 1 || this.shutdownTriggerCount % 3 === 0) {
                await WindowsNotifier.showNotification(
                    'Inactivity Warning',
                    `System will shutdown in ${remainingTime} seconds due to low activity`,
                    'warning'
                );
            }

            if (this.shutdownTriggerCount >= this.config.trigger_shutdown_times) {
                await this.triggerShutdown();
            }
        } else if (!shouldTriggerShutdown && this.shutdownTriggerCount > 0) {
            this.shutdownTriggerCount = 0;
            this.emit('activity-detected');

            await WindowsNotifier.showNotification(
                'Activity Detected',
                'Shutdown cancelled - system activity resumed',
                'info'
            );
        }
    }

    checkBasicConditions(stats) {
        return stats.cpu < this.config.trigger_cpu_usage_target &&
            stats.networkTx < this.config.trigger_network_usage_target &&
            stats.networkRx < this.config.trigger_network_usage_target &&
            stats.diskRead < (this.config.trigger_disk_usage_target || 1) &&
            stats.diskWrite < (this.config.trigger_disk_usage_target || 1);
    }

    async checkAdvancedConditions() {
        try {
            // Check for active RDP sessions
            if (this.config.check_rdp_sessions) {
                const sessions = await this.getActiveSessions();
                if (sessions.length > 1) return false; // More than console session
            }

            // Check for running backups or critical processes
            if (this.config.check_critical_processes) {
                const criticalProcs = this.processMonitor.getCriticalProcesses();
                if (criticalProcs.some(proc => proc.cpu > 5)) return false;
            }

            return true;
        } catch (error) {
            // If we can't check advanced conditions, err on the side of caution
            return false;
        }
    }

    checkProcessConditions() {
        if (!this.config.enable_process_monitoring) return true;

        // Check if any excluded processes are running with high CPU
        const activeProcesses = this.processMonitor.getActiveProcesses(this.config.process_cpu_threshold || 5);

        // Check against exclusion list
        if (this.config.process_exclusion_list) {
            const excludedProcesses = this.config.process_exclusion_list.split(',').map(p => p.trim().toLowerCase());
            for (const proc of activeProcesses) {
                if (excludedProcesses.some(excluded => proc.name.toLowerCase().includes(excluded))) {
                    return false;
                }
            }
        }

        return true;
    }

    isInBlackoutPeriod() {
        if (!this.config.blackout_periods) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const blackoutPeriods = this.config.blackout_periods.split(',');

        for (const period of blackoutPeriods) {
            const [days, timeRange] = period.trim().split(' ');
            const [startTime, endTime] = timeRange.split('-');

            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;

            // Check if current day is in the specified days
            const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const currentDayName = dayNames[currentDay];

            if (days.toLowerCase().includes(currentDayName) || days.toLowerCase().includes('all')) {
                if (currentTime >= startMinutes && currentTime <= endMinutes) {
                    return true;
                }
            }
        }

        return false;
    }

    async getActiveSessions() {
        return new Promise((resolve) => {
            new PowerShell('query session', false, (error, output) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const sessions = output.split('\n')
                    .filter(line => line.trim() && !line.includes('SESSIONNAME'))
                    .map(line => line.trim());

                resolve(sessions);
            });
        });
    }

    getCurrentStats() {
        return {
            cpu: this.cpuAverage.getAverage(),
            networkTx: this.networkTxAverage.getAverage(),
            networkRx: this.networkRxAverage.getAverage(),
            diskRead: this.diskReadAverage.getAverage(),
            diskWrite: this.diskWriteAverage.getAverage(),
            memory: this.memoryAverage.getAverage(),
            timestamp: new Date(),
            dataPoints: this.cpuAverage.getSize()
        };
    }

    async triggerShutdown() {
        if (this.isShutdownPending) return;

        this.isShutdownPending = true;
        this.shutdownEvents++;
        this.stop();

        // Calculate energy savings (rough estimate)
        const hoursRunning = (Date.now() - this.startTime) / (1000 * 60 * 60);
        const estimatedSavings = hoursRunning * 0.1; // Rough estimate: 100W system
        this.totalEnergySaved += estimatedSavings;

        this.emit('shutdown-initiated', {
            countdown: this.config.trigger_shutdown_countdown,
            energySaved: estimatedSavings,
            totalEvents: this.shutdownEvents
        });

        // Show final notification
        await WindowsNotifier.showNotification(
            'System Shutdown',
            `Shutting down in ${this.config.trigger_shutdown_countdown} seconds`,
            'info'
        );

        // Save final logs
        await this.saveLogs();

        // Execute shutdown with enhanced message
        const shutdownMessage = `System shutdown by Inactivity Monitor v${SETTINGS_VERSION}. ` +
            `Triggered after ${this.config.trigger_shutdown_times * this.config.trigger_interval} seconds of low activity. ` +
            `Energy saved: ${estimatedSavings.toFixed(2)}kWh`;

        const shutdownCommand = `shutdown -s -t ${this.config.trigger_shutdown_countdown} -c "${shutdownMessage}"`;

        new PowerShell(shutdownCommand, false, (err) => {
            if (err) {
                this.emit('error', `Shutdown command failed: ${err.message}`);
            } else {
                this.emit('shutdown-scheduled');
                setTimeout(() => process.exit(0), Math.min(this.config.trigger_shutdown_countdown * 1000, 10000));
            }
        });
    }

    async saveLogs() {
        if (!this.config.enable_logging) return;

        try {
            const logDir = path.join(__dirname, 'logs');
            await fs.mkdir(logDir, {recursive: true});

            const timestamp = new Date().toISOString().split('T')[0];
            const logFile = path.join(logDir, `activity_${timestamp}.json`);

            const logData = {
                date: timestamp,
                startTime: this.startTime,
                uptime: process.uptime(),
                shutdownEvents: this.shutdownEvents,
                totalEnergySaved: this.totalEnergySaved,
                entries: this.activityLogger.getRecent(100)
            };

            await fs.writeFile(logFile, JSON.stringify(logData, null, 2));
        } catch (error) {
            this.emit('error', `Log saving failed: ${error.message}`);
        }
    }

    resetAverages() {
        this.cpuAverage.reset();
        this.networkTxAverage.reset();
        this.networkRxAverage.reset();
        this.diskReadAverage.reset();
        this.diskWriteAverage.reset();
        this.memoryAverage.reset();
        this.emit('averages-reset');
    }

    getSystemReport() {
        const uptime = process.uptime();
        const stats = this.getCurrentStats();

        return {
            version: SETTINGS_VERSION,
            uptime: uptime,
            startTime: this.startTime,
            shutdownEvents: this.shutdownEvents,
            totalEnergySaved: this.totalEnergySaved,
            currentStats: stats,
            isShutdownPending: this.isShutdownPending,
            shutdownTriggerCount: this.shutdownTriggerCount,
            activeProcesses: this.processMonitor.getActiveProcesses().length,
            logEntries: this.activityLogger.entries.length
        };
    }
}

export default SystemMonitor;