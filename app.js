const express = require('express');
const logger = require('morgan');

const app = express();

const PowerShell = require("powershell");
const si = require('systeminformation');
const cpu = require('node-os-utils').cpu;
const average = require('@extra-array/average');
const nconf = require('nconf');
const figlet = require('figlet');
const Logger = require('chegs-simple-logger');
let log = new Logger({
    logGeneral: true,
    logWarning:  true,
    logError:  false,
    logDetail: false,
    logDebug: true
});

const AutoGitUpdate = require('auto-git-update');

const config = {
    repository: 'https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows',
    tempLocation: require("os").tmpdir(),
    executeOnComplete: 'npm-install.bat',
    exitOnComplete: true
}

const updater = new AutoGitUpdate(config);

updater.autoUpdate();

nconf.argv()
    .env()
    .file({ file: 'config.conf' });

//First Time Application Config
if(!nconf.get('version')){
    nconf.set('version', (Math.random() + 1).toString(36).substring(7));
    nconf.set('trigger_interval_seconds', 5);
    nconf.set('trigger_shutdown_times', 60);
    nconf.set('trigger_shutdown_countdown_seconds', 60);
    nconf.set('trigger_cpu_percentage_target', 15);
    nconf.set('trigger_network_percentage_target', 100);
    nconf.set('debug', false);
    nconf.save();
}

figlet.text('Welcome, ' + require("os").userInfo().username +' :O', {
    horizontalLayout: 'default',
    verticalLayout: 'default',
    whitespaceBreak: true
}, function(err, data) {
    if (err) {
        console.dir(err);
        return;
    }
    console.log(data);
});

let
    cpu_usage = Array(),
    network_usage_tx = Array(),
    network_usage_rx = Array();

let trigger_shutdown = 0;

setInterval(function (){
    si.networkStats()
        .then(data => {
            data.tx_sec = undefined;
            network_usage_tx.push(data[0].tx_sec);
            network_usage_rx.push(data[0].rx_sec);
        })
        .catch(error => console.error(error));

    cpu.usage()
        .then(cpuPercentage => {
            cpu_usage.push(cpuPercentage);
        })
        .catch(error => console.error(error));
}, 1000)

let active_trigger = 0;

setInterval(function () {

    const avg_cpu = average(cpu_usage);
    let avg_network_tx = average(network_usage_tx) * 0.008 * 0.001;
    let avg_network_rx = average(network_usage_rx) * 0.008 * 0.001;

    if(nconf.get('debug')) log.debug(`DEBUG; CPU: ${parseFloat(avg_cpu).toFixed(5)}, Transmit: ${parseFloat(avg_network_tx).toFixed(5)}, Receive: ${parseFloat(avg_network_rx).toFixed(5)}`);

    if (avg_cpu < nconf.get('trigger_cpu_percentage_target') && avg_network_tx < nconf.get('trigger_network_percentage_target') && avg_network_rx < nconf.get('trigger_network_percentage_target')) {
        trigger_shutdown++;

        const shutdown_countdown = nconf.get('trigger_shutdown_times') * nconf.get('trigger_interval_seconds') - (nconf.get('trigger_interval_seconds') * trigger_shutdown);

        active_trigger = 1;
        log.warning('Shutdown in ' + shutdown_countdown + ' Seconds due to inactivity or low usage on your computer.');
    } else {
        trigger_shutdown = 0;

        if (active_trigger === 1) {
            log.detail('Your Windows is back to active!');
            active_trigger = 0;
        }
    }

    if (trigger_shutdown === nconf.get('trigger_shutdown_times')) {
        trigger_shutdown = 0;
        log.detail('Attempt to shut down your computer.')
        figlet.text('Goodbye, ' + require("os").userInfo().username + ' :\'(', {
            horizontalLayout: 'default',
            verticalLayout: 'default',
            whitespaceBreak: true
        }, function (err, data) {
            if (err) {
                console.dir(err);
                return;
            }
            log.error(data);
        });
        new PowerShell(
            `shutdown -s -t ${nconf.get('trigger_shutdown_countdown_seconds')} -c "The system will shut down in ${nconf.get('trigger_shutdown_countdown_seconds')} seconds by Auto shutdown when Inactivity in ${nconf.get('trigger_shutdown_times') * nconf.get('trigger_interval_seconds')} seconds."`, 
            false, 
            function(){
                log.detail('Success attempt to send shutdown signal and application to exit in 10 seconds')
            }
        );

        setTimeout(function () {
            process.exit(1);
        }, 10000);
    }

    cpu_usage = Array();
    avg_network_tx = Array();
    avg_network_rx = Array();

},nconf.get('trigger_interval_seconds') * 1000)

app.use(logger('dev'));

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // show error on console
  console.error(err.status || 500);
});

module.exports = app;
