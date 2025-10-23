import { EventEmitter } from "node:events";

export class ChunkedSentenceStream extends EventEmitter {
    masks = []
    max_word = 12
    emitBuffer = ""
    interimBuffer = ""
    lastWordTimestamp = 0
    silenceThreshold = 500
    constructor(max_word = 12) {
        super();
        this.max_word = max_word;
        this.lastWordTimestamp = new Date().getTime();
    }

    pushDelta(delta, isFinal) {

        const currentTime = new Date();
        const currentTimestamp = currentTime.getTime();

        const timeGap = this.lastWordTimestamp ? currentTimestamp - this.lastWordTimestamp : 0;

        if (timeGap >= this.silenceThreshold) {
            console.log(`[SILENCE DETECTED] No speech for ${timeGap}ms. Logging final sentence.`);
            this.logFinalSentence(delta);
            this.lastWordTimestamp = currentTime.getTime();
            
        }
    }

    logFinalSentence(delta) {
        const currentTime = new Date();
        const formattedTime = `${currentTime.toLocaleString()}.${currentTime.getMilliseconds().toString().padStart(3, '0')}`;
        console.log(`[FINAL ${formattedTime}] ${delta}`);
        this.emit("sentence", delta);
    }

    clear() {
        this.buffer = "";
    }
}
