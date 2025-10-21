import { EventEmitter } from "node:events";

export class ChunkedSentenceStream extends EventEmitter {
    constructor() {
        super();
    }

    pushDelta(delta, isFinal) {
        this.buffer += delta;

        let delimiterIndex = -1;
        while (
            (delimiterIndex = this.delimiters
                .map((delimiter) => this.buffer.indexOf(delimiter))
                .filter((index) => index !== -1)
                .sort((a, b) => a - b)[0]) !== undefined
        ) {
            if (delimiterIndex === -1) break;

            const sentence = this.buffer.slice(0, delimiterIndex + 1).trim();
            this.emit("sentence", sentence);

            this.buffer = this.buffer.slice(delimiterIndex + 1);
        }

        if (isFinal && this.buffer.trim().length > 0) {
            this.emit("sentence", this.buffer.trim());
            this.clear();
        }
    }

    clear() {
        this.buffer = "";
    }
}