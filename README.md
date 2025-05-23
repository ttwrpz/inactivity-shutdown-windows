# Inactivity Shutdown Windows

![Version](https://img.shields.io/github/package-json/v/ttwrpz/inactivity-shutdown-windows?color=brightgreen&cacheSeconds=2592000)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/EpicEmeraldPlayz/nodejs-inactivity-shutdown-windows/blob/master/LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D12.0.0-brightgreen)](https://nodejs.org/)
[![Windows Only](https://img.shields.io/badge/platform-Windows-blue)](https://www.microsoft.com/windows)

An intelligent Windows auto-shutdown utility that monitors CPU and network activity to automatically shut down your system during periods of inactivity. Perfect for energy saving, server management, and unattended operations.

> [!WARNING] 
> This application will shut down your computer automatically. Always save your work and ensure proper configuration before use. The application provides countdown warnings, but use responsibly.

## Features

### **Smart Monitoring**
- **Advanced CPU monitoring** with moving average calculations
- **Intelligent network activity detection** across all interfaces
- **Configurable thresholds** for CPU usage and network traffic
- **Real-time activity feedback** with immediate status updates

### **Enhanced Intelligence**
- **Moving average algorithms** for stable and accurate readings
- **Auto-detection of primary network interfaces** (excludes loopback)
- **Minimum data requirements** before triggering shutdown decisions
- **Graceful recovery** when activity resumes

### **User-Friendly Interface**
- **Colorful console output** with clear status indicators
- **Real-time countdown warnings** showing exact time remaining
- **Professional ASCII art banners** for visual appeal
- **Comprehensive logging** with debug mode support

### **Performance Optimized**
- **Memory-efficient data structures** using circular buffers
- **Optimized data collection** with smart interval management
- **Minimal resource footprint** during monitoring
- **Proper cleanup** and graceful shutdown handling

## Requirements

- **Operating System**: Windows (Win32)
- **Node.js**: Version 12.0.0 or higher
- **NPM**: Version 6.0.0 or higher
- **Administrator Privileges**: Required for shutdown commands

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ttwrpz/inactivity-shutdown-windows.git
cd inactivity-shutdown-windows

# Install dependencies
npm install
```

### Usage

```bash
# Start the application
npm start

# Run in development mode with enhanced logging
npm run dev
```

### First Run Setup

On first launch, you'll be guided through an interactive configuration setup:

```
Configuration Setup
Config > Status checking interval (seconds): (5)
Config > Average calculation reset interval (seconds): (60)
Config > Number of consecutive low-activity checks before shutdown: (12)
Config > Shutdown countdown timer (seconds): (60)
Config > Maximum CPU usage threshold (%): (10)
Config > Maximum network usage threshold (Mbps): (1)
Config > Enable debug logging: (false)
```

## Configuration Options

| Parameter                      | Description                            | Default    | Range        |
|--------------------------------|----------------------------------------|------------|--------------|
| `trigger_interval`             | How often to check system activity     | 5 seconds  | 1-300s       |
| `average_interval_reset`       | When to reset statistical averages     | 60 seconds | 30-3600s     |
| `trigger_shutdown_times`       | Consecutive low-activity checks needed | 12 times   | 3-100        |
| `trigger_shutdown_countdown`   | Delay before actual shutdown           | 60 seconds | 10-300s      |
| `trigger_cpu_usage_target`     | Maximum CPU usage threshold            | 10%        | 1-50%        |
| `trigger_network_usage_target` | Maximum network usage threshold        | 1 Mbps     | 0.1-100 Mbps |
| `debug`                        | Enable detailed console logging        | false      | true/false   |

## How It Works

### 1. **Data Collection**
- Samples CPU usage every second using moving averages
- Monitors network transmission and reception rates
- Automatically detects and uses primary network interface

### 2. **Intelligence Layer**
- Uses circular buffer algorithms for stable readings
- Requires minimum data points before making decisions
- Calculates rolling averages over configurable time windows

### 3. **Decision-Making**
- Triggers when **both** CPU and network usage fall below thresholds
- Requires consecutive low-activity readings to prevent false positives
- Provides countdown warnings with option to cancel

### 4. **Shutdown Process**
- Executes Windows shutdown command with configurable delay
- Displays farewell message and final status
- Gracefully closes all monitoring processes

## Example Usage Scenarios

### **Home Media Server**
```
CPU Threshold: 5%
Network Threshold: 0.5 Mbps
Check Interval: 10 seconds
Trigger Count: 18 times (3 minutes of inactivity)
```

### **Development Workstation**
```
CPU Threshold: 15%
Network Threshold: 2 Mbps
Check Interval: 5 seconds
Trigger Count: 24 times (2 minutes of inactivity)
```

### **Render Farm Node**
```
CPU Threshold: 2%
Network Threshold: 0.1 Mbps
Check Interval: 30 seconds
Trigger Count: 10 times (5 minutes of inactivity)
```

### Configuration File

The application stores settings in `app.config.json`. You can manually edit this file:

```json
{
  "settings_version": "3.0.0",
  "trigger_interval": 5,
  "average_interval_reset": 60,
  "trigger_shutdown_times": 12,
  "trigger_shutdown_countdown": 60,
  "trigger_cpu_usage_target": 10,
  "trigger_network_usage_target": 1,
  "debug": false
}
```

## Troubleshooting

### Common Issues

**Issue**: Application doesn't detect network activity
- **Solution**: Run as Administrator to access network statistics
- **Alternative**: Check Windows Firewall settings

**Issue**: Shutdown command fails
- **Solution**: Ensure PowerShell execution policy allows scripts
- **Command**: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Issue**: CPU readings seem inaccurate
- **Solution**: Enable debug mode to see real-time statistics
- **Check**: Task Manager to compare readings

### Debug Mode

Enable debug logging to see detailed information:

```json5
{
  "debug": true // Modify app.config.json
} 
```

Debug output shows:
- Real-time CPU and network statistics
- Moving average calculations
- Trigger condition evaluations
- Internal state changes

## Status Indicators

The application uses color-coded console output:

- 🟢 **Green**: System active, normal operation
- 🟡 **Yellow**: Configuration values and statistics
- 🟠 **Orange**: Low activity warnings with countdown
- 🔴 **Red**: Shutdown initiated
- 🔵 **Blue**: Debug information and statistics
- ⚪ **Gray**: Background processes and resets

## Safety Features

- **Graceful shutdown handling** with proper cleanup
- **Signal handling** for CTRL+C and system termination
- **Error recovery** with automatic restart capabilities
- **Validation** of all configuration inputs
- **Countdown warnings** with clear time remaining
- **Activity detection** cancels pending shutdowns immediately

## What's New in v5.0.0

### **Major Improvements**
- **Complete architecture rewrite** with object-oriented design
- **Event-driven system** for better modularity and responsiveness
- **Moving average algorithms** for more stable and accurate monitoring
- **Enhanced user interface** with colorful, informative console output
- **Smart network interface detection** excluding loopback interfaces
- **Comprehensive error handling** and recovery mechanisms

### **Technical Enhancements**
- **Memory-efficient data structures** using circular buffers
- **Better resource management** with proper interval cleanup
- **Improved configuration system** with validation and defaults
- **Professional logging system** with categorized message types
- **Graceful shutdown handling** for clean application termination

### **User Experience**
- **Real-time feedback** showing exact countdown timers
- **Professional ASCII art** for visual appeal
- **Clear status indicators** with color-coded messages
- **Enhanced setup wizard** with better input validation
- **Detailed configuration display** showing all current settings

### Development Setup

```bash
git clone https://github.com/ttwrpz/inactivity-shutdown-windows.git
cd inactivity-shutdown-windows
npm install
npm run dev
```