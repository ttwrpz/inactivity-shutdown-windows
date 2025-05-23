import http from "node:http";
import url from "node:url";
import colors from "@colors/colors";

class WebInterface {
    constructor(monitor, port = 8080) {
        this.monitor = monitor;
        this.port = port;
        this.server = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(this.port, () => {
            console.log(colors.cyan(`🌐 Web interface available at http://localhost:${this.port}`));
            this.isRunning = true;
        });
    }

    stop() {
        if (this.server && this.isRunning) {
            this.server.close();
            this.isRunning = false;
        }
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        try {
            switch (pathname) {
                case '/':
                    this.serveHomePage(res);
                    break;
                case '/api/status':
                    this.serveStatus(res);
                    break;
                case '/api/config':
                    this.serveConfig(res);
                    break;
                case '/api/logs':
                    this.serveLogs(res);
                    break;
                case '/api/processes':
                    this.serveProcesses(res);
                    break;
                default:
                    res.writeHead(404);
                    res.end(JSON.stringify({error: 'Not found'}));
            }
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({error: error.message}));
        }
    }

    serveHomePage(res) {
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inactivity Monitor Dashboard</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; }
                .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { text-align: center; color: #333; margin-bottom: 30px; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
                .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
                .stat-label { color: #666; margin-top: 5px; }
                .status-active { color: #28a745; }
                .status-warning { color: #ffc107; }
                .status-danger { color: #dc3545; }
                .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
                .refresh-btn:hover { background: #0056b3; }
                .log-entry { padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 0.9em; }
                .processes { max-height: 300px; overflow-y: auto; }
                .process { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Inactivity Monitor Dashboard</h1>
                    <button class="refresh-btn" onclick="loadData()">Refresh</button>
                </div>
                
                <div class="card">
                    <h2>System Status</h2>
                    <div class="stats" id="stats">
                        <div class="stat">
                            <div class="stat-value" id="cpu-usage">--</div>
                            <div class="stat-label">CPU Usage (%)</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value" id="network-tx">--</div>
                            <div class="stat-label">Network TX (Mbps)</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value" id="network-rx">--</div>
                            <div class="stat-label">Network RX (Mbps)</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value" id="shutdown-status">--</div>
                            <div class="stat-label">Shutdown Status</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2>Configuration</h2>
                    <pre id="config-display"></pre>
                </div>

                <div class="card">
                    <h2>Active Processes</h2>
                    <pre class="processes" id="processes"></pre>
                </div>

                <div class="card">
                    <h2>Recent Activity</h2>
                    <div id="logs" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
            </div>

            <script>
                async function loadData() {
                    try {
                        const [status, config, logs, processes] = await Promise.all([
                            fetch('/api/status').then(r => r.json()),
                            fetch('/api/config').then(r => r.json()),
                            fetch('/api/logs').then(r => r.json()),
                            fetch('/api/processes').then(r => r.json())
                        ]);

                        updateStats(status);
                        updateConfig(config);
                        updateLogs(logs);
                        updateProcesses(processes);
                    } catch (error) {
                        console.error('Failed to load data:', error);
                    }
                }

                function updateStats(status) {
                    document.getElementById('cpu-usage').textContent = status.cpu ? status.cpu.toFixed(1) : '--';
                    document.getElementById('network-tx').textContent = status.networkTx ? status.networkTx.toFixed(2) : '--';
                    document.getElementById('network-rx').textContent = status.networkRx ? status.networkRx.toFixed(2) : '--';
                    
                    const shutdownEl = document.getElementById('shutdown-status');
                    if (status.shutdownPending) {
                        shutdownEl.textContent = 'PENDING';
                        shutdownEl.className = 'stat-value status-danger';
                    } else if (status.shutdownWarning) {
                        shutdownEl.textContent = 'WARNING';
                        shutdownEl.className = 'stat-value status-warning';
                    } else {
                        shutdownEl.textContent = 'ACTIVE';
                        shutdownEl.className = 'stat-value status-active';
                    }
                }

                function updateConfig(config) {
                    const configHtml = Object.entries(config).map(([key, value]) => 
                        \`<div><strong>\${key}:</strong> \${value}</div>\`
                    ).join('');
                    document.getElementById('config-display').innerHTML = configHtml;
                }

                function updateLogs(logs) {
                    const logsHtml = logs.map(log => 
                        \`<div class="log-entry">[\${new Date(log.timestamp).toLocaleTimeString()}] \${log.type}: CPU \${log.data.cpu.toFixed(2) || 0}%</div>\`
                    ).join('');
                    document.getElementById('logs').innerHTML = logsHtml;
                }

                function updateProcesses(processes) {
                    const processHtml = processes.map(proc => 
                        \`<div class="process"><span>\${proc.name}</span><span>\${proc.cpu.toFixed(2)}% CPU</span></div>\`
                    ).join('');
                    document.getElementById('processes').innerHTML = processHtml;
                }

                // Auto-refresh every 5 seconds
                setInterval(loadData, 5000);
                loadData();
            </script>
        </body>
        </html>`;

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(html);
    }

    serveStatus(res) {
        const status = {
            cpu: this.monitor.cpuAverage.getAverage(),
            networkTx: this.monitor.networkTxAverage.getAverage(),
            networkRx: this.monitor.networkRxAverage.getAverage(),
            shutdownPending: this.monitor.isShutdownPending,
            shutdownWarning: this.monitor.shutdownTriggerCount > 0,
            uptime: process.uptime(),
            timestamp: new Date()
        };
        res.end(JSON.stringify(status));
    }

    serveConfig(res) {
        res.end(JSON.stringify(this.monitor.config));
    }

    serveLogs(res) {
        const logs = this.monitor.activityLogger.getRecent(20);
        res.end(JSON.stringify(logs));
    }

    serveProcesses(res) {
        const processes = this.monitor.processMonitor.getActiveProcesses();
        res.end(JSON.stringify(processes));
    }
}

export default WebInterface;