class MovingAverage {
    constructor(windowSize = 12) {
        this.windowSize = windowSize;
        this.values = [];
        this.sum = 0;
    }

    add(value) {
        if (isNaN(value)) return;

        this.values.push(value);
        this.sum += value;

        if (this.values.length > this.windowSize) {
            this.sum -= this.values.shift();
        }
    }

    getAverage() {
        return this.values.length === 0 ? 0 : this.sum / this.values.length;
    }

    reset() {
        this.values = [];
        this.sum = 0;
    }

    hasEnoughData() {
        return this.values.length >= Math.min(3, this.windowSize);
    }

    getSize() {
        return this.values.length;
    }
}

export default MovingAverage;