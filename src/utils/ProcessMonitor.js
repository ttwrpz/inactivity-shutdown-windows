import si from "systeminformation";

class ProcessMonitor {
    constructor() {
        this.exclusionList = new Set([
            'System Idle Process',
            'System',
            'Registry',
            'csrss.exe',
            'wininit.exe',
            'winlogon.exe',
            'services.exe',
            'lsass.exe',
            'svchost.exe'
        ]);
        this.criticalProcesses = new Set([
            'explorer.exe',
            'dwm.exe',
            'audiodg.exe'
        ]);
        this.runningProcesses = new Map();
    }

    async updateProcessList() {
        try {
            const processes = await si.processes();
            this.runningProcesses.clear();

            processes.list.forEach(proc => {
                if (proc.cpu > 0 || proc.mem > 100) {
                    this.runningProcesses.set(proc.pid, {
                        name: proc.name,
                        cpu: proc.cpu,
                        memory: proc.mem,
                        command: proc.command
                    });
                }
            });

            return this.runningProcesses;
        } catch (error) {
            throw new Error(`Process monitoring failed: ${error.message}`);
        }
    }

    hasActiveProcesses(cpuThreshold = 5) {
        for (const [pid, proc] of this.runningProcesses) {
            if (this.exclusionList.has(proc.name)) continue;
            if (proc.cpu > cpuThreshold) return true;
        }
        return false;
    }

    getCriticalProcesses() {
        const critical = [];
        for (const [pid, proc] of this.runningProcesses) {
            if (this.criticalProcesses.has(proc.name)) {
                critical.push(proc);
            }
        }
        return critical;
    }

    getActiveProcesses(minCpu = 1) {
        const active = [];
        for (const [pid, proc] of this.runningProcesses) {
            if (!this.exclusionList.has(proc.name) && proc.cpu >= minCpu) {
                active.push(proc);
            }
        }
        return active.sort((a, b) => b.cpu - a.cpu);
    }
}

export default ProcessMonitor;