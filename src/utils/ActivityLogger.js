class ActivityLogger {
    constructor(maxEntries = 1000) {
        this.entries = [];
        this.maxEntries = maxEntries;
    }

    log(type, data) {
        const entry = {
            timestamp: new Date(),
            type: type,
            data: {...data}
        };

        this.entries.unshift(entry);

        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
    }

    getRecent(count = 50) {
        return this.entries.slice(0, count);
    }

    getByType(type) {
        return this.entries.filter(entry => entry.type === type);
    }
}

export default ActivityLogger;