/* ================================ */
/*    DO NOT CHANGE THIS SETTINGS   */
/* ================================ */

const settings_version = '2.0.0';

/* ================================ */
/*          PACKAGES IMPORT         */
/* ================================ */

const cpu = require('node-os-utils').cpu;
const Logger = require("chegs-simple-logger");
const average = require("@extra-array/average");
const PowerShell = require("powershell");
const si = require("systeminformation");
const nconf = require("nconf");
const figlet = require("figlet");
const prompt = require("prompt");
const colors = require("@colors/colors/safe");

let log = new Logger({
    logGeneral: true,
    logWarning: true,
    logError: false,
    logDetail: false,
    logDebug: true
});

/* ================================ */
/*           CONFIGURATIONS         */
/* ================================ */

nconf.argv()
    .env()
    .file({file: './config.conf'});

if (nconf.get('settings_version') !== settings_version) {

    console.log(
        colors.rainbow(figlet.textSync('Setting up', {
            horizontalLayout: 'default',
            verticalLayout: 'default',
            whitespaceBreak: true
        }))
    );

    const warning_number = 'You must enter numbers only!',
        warning_boolean = 'You must enter \'true\', \'t\', \'false\', \'f\' only!';

    const schema = {
        properties: {
            trigger_interval: {
                required: true,
                default: nconf.get('trigger_interval') ?? 5,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Status Checking Interval (seconds)'
            },
            average_interval_reset: {
                required: true,
                default: nconf.get('average_interval_reset') ?? 60,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Average Interval Reset (seconds)'
            },
            trigger_shutdown_times: {
                required: true,
                default: nconf.get('trigger_shutdown_times') ?? 60,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Auto-shutdown maximum requirements met (times)'
            },
            trigger_shutdown_countdown: {
                required: true,
                default: nconf.get('trigger_shutdown_countdown') ?? 60,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Auto-shutdown countdown (seconds)'
            },
            trigger_cpu_usage_target: {
                required: true,
                default: nconf.get('trigger_cpu_usage_target') ?? 15,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Maximum CPU usage percentage (%)'
            },
            trigger_network_usage_target: {
                required: true,
                default: nconf.get('trigger_network_usage_target') ?? 100,
                type: 'number',
                pattern: /\d+/,
                message: warning_number,
                description: 'Maximum Network usage percentage (Mbps)'
            },
            debug: {
                required: false,
                default: nconf.get('debug') ?? true,
                type: 'boolean',
                message: warning_boolean,
                description: 'Debug'
            }
        }

    }

    prompt.message = colors.rainbow("Setup");
    prompt.delimiter = colors.green(" > ");

    (function(){
        return new Promise(function(resolve) {

            prompt.start();

            prompt.get(schema, function (err, result) {
                nconf.set('settings_version', settings_version);
                nconf.set('trigger_interval', result.trigger_interval);
                nconf.set('average_interval_reset', result.average_interval_reset);
                nconf.set('trigger_shutdown_times', result.trigger_shutdown_times);
                nconf.set('trigger_shutdown_countdown', result.trigger_shutdown_countdown);
                nconf.set('trigger_cpu_usage_target', result.trigger_cpu_usage_target);
                nconf.set('trigger_network_usage_target', result.trigger_network_usage_target);
                nconf.set('debug', result.debug);
                nconf.save();

                console.log(colors.green(
                    figlet.textSync('Config Saved!', {
                        horizontalLayout: 'default',
                        verticalLayout: 'default',
                        whitespaceBreak: true
                    }))
                );

                resolve();
            });
        }).then(function () {
            log.detail(colors.green('Config saved!'));
            log.detail(colors.red('Please restart application again!'));
            process.exit();
        })
    })();

} else {
    welcome();
}

/* ================================ */
/*           WELCOME, USER!         */
/* ================================ */

function welcome() {
    console.log(
        colors.yellow(figlet.textSync(`Welcome, ${require("os").userInfo().username}!`, {
            horizontalLayout: 'default',
            verticalLayout: 'default',
            whitespaceBreak: true
        }))
    );
}

/* ================================ */
/*             VARIABLES            */
/* ================================ */

let cpu_usage = Array(),
    network_usage_tx = Array(),
    network_usage_rx = Array();

let trigger_shutdown = 0;
let active_trigger = 0;

const measure_system_reset = setInterval(function () {
    cpu_usage = Array();
    network_usage_rx = Array();
    network_usage_tx = Array();
}, nconf.get('average_interval_reset') * 1000 - 500);

const measure_system_data = setInterval(function () {
    si.networkStats()
        .then(data => {
            network_usage_tx.push(data[0].tx_sec);
            network_usage_rx.push(data[0].rx_sec);
        })
        .catch(error => log.error(error));

    cpu.usage()
        .then(cpuPercentage => {
            cpu_usage.push(cpuPercentage);
        })
        .catch(error => console.error(error));

}, 1000)

const measure_system = setInterval(function () {

    const avg_cpu = average(cpu_usage);
    let avg_network_tx = average(network_usage_tx) / 125000;
    let avg_network_rx = average(network_usage_rx) / 125000;

    if (nconf.get('debug')) log.debug(`${colors.blue('CPU')}: ${parseFloat(avg_cpu).toFixed(5)} ${colors.yellow('%')}, ${colors.blue('Network Transmitted')}: ${avg_network_tx.toFixed(5)} ${colors.yellow('Mbps')}, ${colors.blue('Network Received')}: ${avg_network_rx.toFixed(5)} ${colors.yellow('Mbps')}`);

    if (avg_cpu < nconf.get('trigger_cpu_usage_target') && avg_network_tx < nconf.get('trigger_network_usage_target') && avg_network_rx < nconf.get('trigger_network_usage_target')) {
        trigger_shutdown++;

        const shutdown_countdown = nconf.get('trigger_shutdown_times') * nconf.get('trigger_interval') - (nconf.get('trigger_interval') * trigger_shutdown);

        active_trigger = 1;
        log.warning(`Shutting down in ${colors.bgRed(shutdown_countdown + ' seconds')} due to inactivity or low usage on your computer.`);
    } else {
        trigger_shutdown = 0;

        if (active_trigger === 1) {
            log.detail('Your Windows is back to active!');
            active_trigger = 0;
        }
    }

    if (trigger_shutdown === nconf.get('trigger_shutdown_times')) {
        trigger_shutdown = 0;
        log.detail('Attempting to shutdown your computer.')
        console.log(
            colors.red(figlet.textSync('Goodbye, ' + require("os").userInfo().username, {
                horizontalLayout: 'default',
                verticalLayout: 'default',
                whitespaceBreak: true
            }))
        );
        new PowerShell(
            `shutdown -s -t ${nconf.get('trigger_shutdown_countdown')} -c "Your system will be shutdown in ${nconf.get('trigger_shutdown_countdown')} seconds by Inactivity Shutdown Windows (in ${nconf.get('trigger_shutdown_times') * nconf.get('trigger_interval')} seconds)."`,
            false,
            function () {
                log.detail('Success attempted to sending shutdown signal and application will exit in 10 seconds')
            }
        );

        clearInterval(measure_system);
        clearInterval(measure_system_data);
        clearInterval(measure_system_reset);

        setTimeout(function () {
            process.exit();
        }, 10000);
    }

}, nconf.get('trigger_interval') * 1000)