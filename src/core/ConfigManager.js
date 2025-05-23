import nconf from "nconf";
import Logger from "chegs-simple-logger";
import colors from "@colors/colors";
import figlet from "figlet";
import prompt from "prompt";
import fs from "node:fs/promises";
import {SETTINGS_VERSION} from "../../app.js";

class ConfigManager {
    constructor() {
        nconf.argv().env().file({file: './app.config.json'});
        this.setupLogging();
    }

    setupLogging() {
        this.log = new Logger({
            logGeneral: true,
            logWarning: true,
            logError: true,
            logDetail: true,
            logDebug: nconf.get('debug') ?? false
        });
    }

    async ensureConfiguration() {
        if (nconf.get('settings_version') !== SETTINGS_VERSION) {
            await this.runSetup();
        }
        return this.getConfig();
    }

    async runSetup() {
        console.log(colors.rainbow(figlet.textSync('Advanced Setup', {
            horizontalLayout: 'default',
            verticalLayout: 'default',
            whitespaceBreak: true
        })));

        console.log(colors.cyan('🚀 Welcome to Inactivity Shutdown Monitor v' + SETTINGS_VERSION));
        console.log(colors.yellow('This setup will configure advanced monitoring features.\n'));

        const schema = {
            properties: {
                // Basic Settings
                trigger_interval: {
                    required: true,
                    default: nconf.get('trigger_interval') ?? 5,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.blue('⏱️  Status checking interval (seconds)')
                },
                average_interval_reset: {
                    required: true,
                    default: nconf.get('average_interval_reset') ?? 60,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.blue('🔄 Average calculation reset interval (seconds)')
                },
                trigger_shutdown_times: {
                    required: true,
                    default: nconf.get('trigger_shutdown_times') ?? 12,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.blue('🎯 Consecutive low-activity checks before shutdown')
                },
                trigger_shutdown_countdown: {
                    required: true,
                    default: nconf.get('trigger_shutdown_countdown') ?? 60,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.blue('⏰ Shutdown countdown timer (seconds)')
                },

                // Threshold Settings
                trigger_cpu_usage_target: {
                    required: true,
                    default: nconf.get('trigger_cpu_usage_target') ?? 8,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.green('🖥️  Maximum CPU usage threshold (%)')
                },
                trigger_network_usage_target: {
                    required: true,
                    default: nconf.get('trigger_network_usage_target') ?? 0.5,
                    type: 'number',
                    pattern: /^[\d.]+$/,
                    message: 'Must be a positive number',
                    description: colors.green('🌐 Maximum network usage threshold (Mbps)')
                },
                trigger_disk_usage_target: {
                    required: true,
                    default: nconf.get('trigger_disk_usage_target') ?? 0.5,
                    type: 'number',
                    pattern: /^[\d.]+$/,
                    message: 'Must be a positive number',
                    description: colors.green('💽 Maximum disk I/O threshold (MB/s)')
                },

                // Advanced Features
                enable_process_monitoring: {
                    required: false,
                    default: nconf.get('enable_process_monitoring') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.magenta('🔍 Enable process monitoring')
                },
                enable_web_interface: {
                    required: false,
                    default: nconf.get('enable_web_interface') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.magenta('🌐 Enable web dashboard')
                },
                web_port: {
                    required: true,
                    default: nconf.get('web_port') ?? 8080,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a valid port number',
                    description: colors.magenta('🔌 Web dashboard port')
                },
                enable_notifications: {
                    required: false,
                    default: nconf.get('enable_notifications') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.magenta('🔔 Enable Windows notifications')
                },

                // Process Monitoring
                process_cpu_threshold: {
                    required: true,
                    default: nconf.get('process_cpu_threshold') ?? 5,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.cyan('⚡ Process CPU threshold for exclusion (%)')
                },
                process_exclusion_list: {
                    required: false,
                    default: nconf.get('process_exclusion_list') ?? 'chrome,firefox,vlc,steam',
                    type: 'string',
                    description: colors.cyan('🚫 Process exclusion list (comma-separated)')
                },

                // Time-based Rules
                blackout_periods: {
                    required: false,
                    default: nconf.get('blackout_periods') ?? '',
                    type: 'string',
                    description: colors.yellow('⏰ Blackout periods (e.g., "mon-fri 09:00-17:00,sat-sun 00:00-23:59")')
                },

                // Logging & Monitoring
                enable_logging: {
                    required: false,
                    default: nconf.get('enable_logging') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.gray('📝 Enable activity logging')
                },
                log_save_interval: {
                    required: true,
                    default: nconf.get('log_save_interval') ?? 300,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.gray('💾 Log save interval (seconds)')
                },
                max_log_entries: {
                    required: true,
                    default: nconf.get('max_log_entries') ?? 1000,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.gray('📊 Maximum log entries to keep in memory')
                },
                moving_average_window: {
                    required: true,
                    default: nconf.get('moving_average_window') ?? 15,
                    type: 'number',
                    pattern: /^\d+$/,
                    message: 'Must be a positive integer',
                    description: colors.gray('📈 Moving average window size (data points)')
                },

                // System Options
                check_rdp_sessions: {
                    required: false,
                    default: nconf.get('check_rdp_sessions') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.red('🔐 Check for active RDP sessions')
                },
                check_critical_processes: {
                    required: false,
                    default: nconf.get('check_critical_processes') ?? true,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.red('⚠️  Check for critical system processes')
                },

                debug: {
                    required: false,
                    default: nconf.get('debug') ?? false,
                    type: 'boolean',
                    message: 'Must be true or false',
                    description: colors.gray('🐛 Enable debug logging')
                }
            }
        };

        prompt.message = colors.rainbow("Config");
        prompt.delimiter = colors.green(" > ");
        prompt.start();

        return new Promise((resolve, reject) => {
            prompt.get(schema, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Save configuration
                nconf.set('settings_version', SETTINGS_VERSION);
                Object.keys(result).forEach(key => {
                    nconf.set(key, result[key]);
                });
                nconf.save();

                this.log.detail(colors.green('Configuration saved successfully!'));
                this.log.detail(colors.cyan('Web dashboard will be available at: http://localhost:' + result.web_port));
                this.log.detail(colors.yellow('Please restart the application to apply changes.'));
                process.exit(0);
            });
        });
    }

    getConfig() {
        return {
            // Basic settings
            trigger_interval: nconf.get('trigger_interval'),
            average_interval_reset: nconf.get('average_interval_reset'),
            trigger_shutdown_times: nconf.get('trigger_shutdown_times'),
            trigger_shutdown_countdown: nconf.get('trigger_shutdown_countdown'),

            // Thresholds
            trigger_cpu_usage_target: nconf.get('trigger_cpu_usage_target'),
            trigger_network_usage_target: nconf.get('trigger_network_usage_target'),
            trigger_disk_usage_target: nconf.get('trigger_disk_usage_target'),

            // Advanced features
            enable_process_monitoring: nconf.get('enable_process_monitoring'),
            enable_web_interface: nconf.get('enable_web_interface'),
            web_port: nconf.get('web_port'),
            enable_notifications: nconf.get('enable_notifications'),

            // Process monitoring
            process_cpu_threshold: nconf.get('process_cpu_threshold'),
            process_exclusion_list: nconf.get('process_exclusion_list'),

            // Time-based rules
            blackout_periods: nconf.get('blackout_periods'),

            // Logging
            enable_logging: nconf.get('enable_logging'),
            log_save_interval: nconf.get('log_save_interval'),
            max_log_entries: nconf.get('max_log_entries'),
            moving_average_window: nconf.get('moving_average_window'),

            // System options
            check_rdp_sessions: nconf.get('check_rdp_sessions'),
            check_critical_processes: nconf.get('check_critical_processes'),

            debug: nconf.get('debug')
        };
    }

    async exportConfig() {
        const config = this.getConfig();
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `config_backup_${timestamp}.json`;

        try {
            await fs.writeFile(filename, JSON.stringify(config, null, 2));
            this.log.detail(colors.green(`Configuration exported to ${filename}`));
        } catch (error) {
            this.log.error(colors.red(`Failed to export configuration: ${error.message}`));
        }
    }

    async importConfig(filename) {
        try {
            const configData = await fs.readFile(filename, 'utf8');
            const config = JSON.parse(configData);

            Object.keys(config).forEach(key => {
                nconf.set(key, config[key]);
            });

            nconf.save();
            this.log.detail(colors.green(`Configuration imported from ${filename}`));
        } catch (error) {
            this.log.error(colors.red(`Failed to import configuration: ${error.message}`));
        }
    }
}

export default ConfigManager;