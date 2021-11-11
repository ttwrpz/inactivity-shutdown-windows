# Welcome to Incitivity Shutdown for Windows 👋
![Version](https://img.shields.io/badge/version-3.0.2-brown.svg?cacheSeconds=2592000)
[![License: mit](https://img.shields.io/badge/License-MIT-red.svg)](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/blob/master/LICENSE)

### 🏠 [Homepage](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/)


> ## About
> The purpose of this project this to shut down Windows automatically based on CPU and Network usage when lower than the configuration.

> ## Default Config (config.conf)
>- **Check system information & status interval**
   `trigger_interval_seconds` - every 5 seconds
>- **Amount of time that meets requirement for auto shutdown to trigger**
   `trigger_shutdown_times` - 60 times
>- **Amount of time before actually shutdown your computer**
   `trigger_shutdown_countdown_seconds` - 60 seconds
>- **Maximum CPU percentage that will trigger auto shutdown**
   `trigger_cpu_percentage_target` - 15%
>- **Maximum Network (TX & RX) percentage that will trigger auto shutdown**
   `trigger_network_percentage_target` - 100 mbps
>- **Debug messages in console**
   `debug` - false

## Install

```sh
npm install
```

## Usage

```sh
npm run start
```

## Author

👤 **EpicEmeraldPlayz**

* Github: [@EpicEmeraldPlayz](https://github.com/EpicEmeraldPlayz)

## 📝 License

Copyright © 2021 [EpicEmeraldPlayz](https://github.com/EpicEmeraldPlayz).

This project is [MIT](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/blob/main/LICENSE) licensed.
***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
