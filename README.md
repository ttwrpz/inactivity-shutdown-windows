# Inactivity Shutdown Windows
![Version](https://img.shields.io/badge/version-4.0.2-yellow.svg?cacheSeconds=2592000)
[![License: mit](https://img.shields.io/badge/License-MIT-red.svg)](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/blob/master/LICENSE)

## About
The purpose of this project is to automatically shut down Windows based on CPU and network usage when it's below a certain threshold.

## Install

```sh
npm install
```

## Usage

```sh
npm run start
```

## Configuration
- `trigger_interval` - Checking system usage every `x` seconds
- `average_interval_reset` - Reset system usage average every `x` seconds
- `trigger_shutdown_times` - Amount of times that meet requirements to trigger
- `trigger_shutdown_countdown` - Amount of time before shutdown
- `trigger_cpu_usage_target` - Maximum CPU percentage requirement
- `trigger_network_usage_target` - Maximum Network Transmitted & Received usage (Mbps) requirement
- `debug` - Enable debug messages in the console

## Author

👤 **EpicEmeraldPlayz**

* Github: [@EpicEmeraldPlayz](https://github.com/EpicEmeraldPlayz)

## 📝 License

Copyright © 2021 [EpicEmeraldPlayz](https://github.com/EpicEmeraldPlayz).

This project is [MIT](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/blob/main/LICENSE) licensed.
