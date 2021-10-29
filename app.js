const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

const shutDownWin = require('noderebootwin');
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
    network_usage = Array();

let trigger_shutdown = 0;

setInterval(function (){
    si.networkStats()
        .then(data => {
            data.tx_sec = undefined;
            network_usage.push(data[0].rx_sec)
        })
        .catch(error => console.error(error));

    cpu.usage()
        .then(cpuPercentage => {
            cpu_usage.push(cpuPercentage);
        })
        .catch(error => console.error(error));
}, 1000)

setInterval(function(){

    const avg_cpu = average(cpu_usage);
    const avg_network = average(network_usage) / 125000;

    if(avg_cpu < nconf.get('trigger_cpu_percentage_target') && avg_network < nconf.get('trigger_network_percentage_target')){
        trigger_shutdown++;
        cpu_usage = Array();
        network_usage = Array()
        const shutdown_countdown = nconf.get('trigger_shutdown_times') * nconf.get('trigger_seconds') - trigger_shutdown
        console.warn('Warning! Shutdown in ' + shutdown_countdown + ' Seconds')
    }else{
        trigger_shutdown = 0;
    }

    if(trigger_shutdown === nconf.get('trigger_shutdown_times')){
        trigger_shutdown = 0;
        shutDownWin.shutdown(nconf.get('trigger_shutdown_countdown_seconds'), false, `The system will shut down in ${nconf.get('trigger_shutdown_countdown_seconds')} seconds by Auto shutdown when Inactivity in ${nconf.get('trigger_shutdown_times') * nconf.get('trigger_seconds')} seconds.`);
    }

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