const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

const PowerShell = require("powershell");
const si = require('systeminformation');
const osu = require('node-os-utils');
const cpu = osu.cpu;
const average = require('@extra-array/average');
const nconf = require('nconf');
const figlet = require('figlet');

nconf.argv()
    .env()
    .file({ file: 'config.json' });

nconf.set('trigger_seconds', 5);
nconf.set('trigger_shutdown_times', 60);
nconf.set('trigger_shutdown_countdown_seconds', 60);
nconf.set('trigger_cpu_percentage_target', 15);
nconf.set('trigger_network_percentage_target', 300);

figlet.text('Welcome, ' + require("os").userInfo().username +'! it\'s running :P', {
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
    let avg_network_tx = average(network_usage_tx) / 125000;
    let avg_network_rx = average(network_usage_rx) / 125000;

    if (avg_cpu < nconf.get('trigger_cpu_percentage_target') && avg_network_tx < nconf.get('trigger_network_percentage_target') && avg_network_rx < nconf.get('trigger_network_percentage_target')) {
        trigger_shutdown++;

        const shutdown_countdown = nconf.get('trigger_shutdown_times') * nconf.get('trigger_seconds') - (nconf.get('trigger_seconds') * trigger_shutdown);

        active_trigger = 1;
        console.warn('Warning! Shutdown in ' + shutdown_countdown + ' Seconds');
    } else {
        trigger_shutdown = 0;

        if (active_trigger == 1) {
            console.log('Your Windows is back to active!');
            active_trigger = 0;
        }
    }

    if (trigger_shutdown === nconf.get('trigger_shutdown_times')) {
        trigger_shutdown = 0;
        figlet.text('Goodbye, ' + require("os").userInfo().username +' :\'(', {
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
        new PowerShell(`shutdown -r -t ${nconf.get('trigger_shutdown_countdown_seconds')} -c "The system will shut down in ${nconf.get('trigger_shutdown_countdown_seconds')} seconds by Auto shutdown when Inactivity in ${nconf.get('trigger_shutdown_times') * nconf.get('trigger_seconds')} seconds."`);
        process.exit(1);
    }

    cpu_usage = Array();
    avg_network_tx = Array();
    avg_network_rx = Array();

},nconf.get('trigger_seconds') * 1000)

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

module.exports = app;