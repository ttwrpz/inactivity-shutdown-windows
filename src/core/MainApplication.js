import {unlink} from "node:fs/promises";
import figlet from "figlet";
import colors from '@colors/colors';
import {SETTINGS_VERSION} from "../../app.js";
import ConfigManager from "./ConfigManager.js";
import SystemMonitor from "./SystemMonitor.js";

class InactivityShutdownApp {
    constructor() {
        this.configManager = new ConfigManager();
        this.monitor = null;
        this.isActiveWarning = false;
        this.stats = {
            startTime: new Date(),
            totalWarnings: 0,
            totalShutdowns: 0,
            energySaved: 0
        };
    }

    async start() {
        try {
            this.showWelcome();
            await this.handleArguments();

            const config = await this.configManager.ensureConfiguration();
            this.monitor = new SystemMonitor(config);

            this.setupEventHandlers();
            this.displayConfiguration(config);
            this.displayFeatureStatus(config);

            this.monitor.start();
            this.configManager.log.detail(colors.green('Monitoring started successfully!'));

            if (config.enable_web_interface) {
                this.configManager.log.detail(colors.cyan(`Web dashboard: http://localhost:${config.web_port}`));
            }

        } catch (error) {
            this.configManager.log.error(`Startup error: ${error.message}`);
            process.exit(1);
        }
    }

    async handleArguments() {
        const args = process.argv.slice(2);

        for (const arg of args) {
            switch (arg) {
                case '--export-config':
                    await this.configManager.exportConfig();
                    process.exit(0);
                    break;
                case '--import-config':
                    const configFile = args[args.indexOf(arg) + 1];
                    if (configFile) {
                        await this.configManager.importConfig(configFile);
                        process.exit(0);
                    }
                    break;
                case '--reset-config':
                    await unlink('./app.config.json').catch(() => {
                    });
                    console.log(colors.green('Configuration reset. Run the application again to reconfigure.'));
                    process.exit(0);
                    break;
                case '--help':
                    this.showHelp();
                    process.exit(0);
                    break;
            }
        }
    }

    showHelp() {
        console.log(colors.cyan(figlet.textSync('Help', {font: 'Small'})));
        console.log(colors.yellow('Available command line options:'));
        console.log('');
        console.log(colors.white('  --export-config') + '     Export current configuration to backup file');
        console.log(colors.white('  --import-config') + '     Import configuration from backup file');
        console.log(colors.white('  --reset-config') + '      Reset configuration to defaults');
        console.log(colors.white('  --help') + '              Show this help message');
        console.log('');
        console.log(colors.gray('Examples:'));
        console.log(colors.gray('  node app.js --export-config'));
        console.log(colors.gray('  node app.js --import-config config_backup_2024-01-01.json'));
        console.log('');
    }

    showWelcome() {
        console.log(colors.yellow(figlet.textSync(`Welcome!`, {
            horizontalLayout: 'default',
            verticalLayout: 'default',
            whitespaceBreak: true
        })));

        console.log(colors.cyan(`Inactivity Shutdown Monitor v${SETTINGS_VERSION}`));
        console.log(colors.gray('Enterprise-grade system monitoring with intelligent shutdown management'));
        console.log('');
    }

    displayConfiguration(config) {
        console.log(colors.blue('Current Configuration:'));
        console.log(`  Check interval: ${colors.yellow(config.trigger_interval + 's')}`);
        console.log(`  CPU threshold: ${colors.yellow(config.trigger_cpu_usage_target + '%')}`);
        console.log(`  Network threshold: ${colors.yellow(config.trigger_network_usage_target + ' Mbps')}`);
        console.log(`  Disk I/O threshold: ${colors.yellow(config.trigger_disk_usage_target + ' MB/s')}`);
        console.log(`  Trigger count: ${colors.yellow(config.trigger_shutdown_times + ' times')}`);
        console.log(`  Shutdown delay: ${colors.yellow(config.trigger_shutdown_countdown + 's')}`);
        console.log(`  Moving average window: ${colors.yellow(config.moving_average_window + ' points')}`);
        console.log('');
    }

    displayFeatureStatus(config) {
        console.log(colors.magenta('Feature Status:'));
        console.log(`  Process monitoring: ${this.getStatusIcon(config.enable_process_monitoring)}`);
        console.log(`  Web interface: ${this.getStatusIcon(config.enable_web_interface)} ${config.enable_web_interface ? `(Port ${config.web_port})` : ''}`);
        console.log(`  Notifications: ${this.getStatusIcon(config.enable_notifications)}`);
        console.log(`  Activity logging: ${this.getStatusIcon(config.enable_logging)}`);
        console.log(`  RDP session check: ${this.getStatusIcon(config.check_rdp_sessions)}`);
        console.log(`  Critical process check: ${this.getStatusIcon(config.check_critical_processes)}`);
        console.log(`  Debug mode: ${this.getStatusIcon(config.debug)}`);

        if (config.blackout_periods) {
            console.log(` Blackout periods: ${colors.yellow('CONFIGURED')}`);
        }

        console.log('');
    }

    getStatusIcon(enabled) {
        return enabled ? colors.green('ENABLED') : colors.red('DISABLED');
    }

    setupEventHandlers() {
        const log = this.configManager.log;

        this.monitor.on('stats', (stats) => {
            if (this.configManager.getConfig().debug) {
                log.debug(
                    `${colors.blue('CPU')}: ${stats.cpu.toFixed(1)}${colors.yellow('%')} | ` +
                    `${colors.blue('NET')}: ↑${stats.networkTx.toFixed(2)} ↓${stats.networkRx.toFixed(2)}${colors.yellow('Mbps')} | ` +
                    `${colors.blue('DISK')}: R${stats.diskRead.toFixed(2)} W${stats.diskWrite.toFixed(2)}${colors.yellow('MB/s')} | ` +
                    `${colors.blue('MEM')}: ${stats.memory.toFixed(1)}${colors.yellow('%')} | ` +
                    `${colors.gray('(' + stats.dataPoints + ' samples)')}`
                );
            }
        });

        this.monitor.on('shutdown-warning', async (data) => {
            this.stats.totalWarnings++;
            const remainingChecks = data.maxCount - data.count;
            const timeToShutdown = remainingChecks * this.configManager.getConfig().trigger_interval;

            this.isActiveWarning = true;

            const warningMsg = `${colors.bgRed(' ⚠️  LOW ACTIVITY DETECTED ')} ` +
                `Shutdown in ${colors.yellow(timeToShutdown + 's')} ` +
                `(${colors.yellow(data.count)}/${colors.yellow(data.maxCount)} triggers) - ${data.reason}`;

            log.warning(warningMsg);

            // Show progress bar
            const progress = Math.round((data.count / data.maxCount) * 20);
            const progressBar = '█'.repeat(progress) + '░'.repeat(20 - progress);
            console.log(colors.red(`Progress: [${progressBar}] ${Math.round((data.count / data.maxCount) * 100)}%`));
        });

        this.monitor.on('activity-detected', async () => {
            if (this.isActiveWarning) {
                log.detail(colors.green('System activity resumed - shutdown cancelled'));
                console.log(colors.green('Monitoring resumed - all averages reset'));
                this.isActiveWarning = false;
            }
        });

        this.monitor.on('shutdown-initiated', async (data) => {
            this.stats.totalShutdowns++;
            this.stats.energySaved += data.energySaved || 0;

            console.log(colors.red(figlet.textSync(`Goodbye!`, {
                horizontalLayout: 'default',
                verticalLayout: 'default',
                whitespaceBreak: true
            })));

            log.detail(`${colors.bgRed(' SHUTDOWN INITIATED ')} System will shutdown in ${data.countdown} seconds`);
            log.detail(`Energy saved this session: ${colors.yellow(data.energySaved.toFixed(2) + ' kWh')}`);
            log.detail(`Total shutdown events: ${colors.yellow(data.totalEvents)}`);
        });

        this.monitor.on('shutdown-scheduled', () => {
            log.detail(colors.green('Shutdown command executed successfully'));
            log.detail(colors.cyan('Final system report saved to logs/'));
        });

        this.monitor.on('blackout-period', (message) => {
            log.detail(colors.yellow(`${message}`));
        });

        this.monitor.on('averages-reset', () => {
            if (this.configManager.getConfig().debug) {
                log.debug(colors.gray('🔄 Statistical averages reset'));
            }
        });

        this.monitor.on('error', (error) => {
            log.error(colors.red(`Monitor error: ${error}`));
        });

        // Graceful shutdown handlers
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('uncaughtException', (error) => {
            log.error(`Uncaught exception: ${error.message}`);
            this.gracefulShutdown('ERROR');
        });

        // Handle Windows-specific signals
        if (process.platform === 'win32') {
            process.on('SIGHUP', () => this.gracefulShutdown('SIGHUP'));
        }
    }

    async gracefulShutdown(signal) {
        const log = this.configManager.log;
        log.detail(`\n${colors.yellow('Received ' + signal + ' - shutting down gracefully...')}`);

        if (this.monitor) {
            // Save final report
            const report = this.monitor.getSystemReport();
            log.detail(colors.cyan('Generating final system report...'));

            // Display final statistics
            console.log(colors.blue('\nSession Statistics:'));
            console.log(`  Uptime: ${colors.yellow(Math.round(report.uptime / 60) + ' minutes')}`);
            console.log(`  Total warnings: ${colors.yellow(this.stats.totalWarnings)}`);
            console.log(`  Shutdown events: ${colors.yellow(report.shutdownEvents)}`);
            console.log(`  Energy saved: ${colors.yellow(report.totalEnergySaved.toFixed(2) + ' kWh')}`);
            console.log(`  Log entries: ${colors.yellow(report.logEntries)}`);

            this.monitor.stop();
        }

        setTimeout(() => {
            this.configManager.log.detail(colors.green('Application closed gracefully'));
            process.exit(0);
        }, 2000);
    }
}

export default InactivityShutdownApp;