import { EventEmitter } from "node:events";


export class ChunkedSentenceStream extends EventEmitter {
    masks = []
    max_word = 12
    constructor(max_word = 12) {
        super();
        this.max_word = max_word;
    }

    pushDelta(delta, isFinal) {
        if(isFinal) {
            let trimText = delta.trim();
            //remove punctuation marks
            trimText = trimText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            this.masks.forEach((mask) => {
                trimText = trimText.replace(new RegExp(mask, 'gi'), '');
            });
            this.masks = [];
            console.log(`FFinalized Speech`);
            if(trimText.trim()){
                this.emit("sentence", trimText);
            }
        }

        if(!isFinal){
            
            let trimText = delta.trim();
            //remove punctuation marks
            trimText = trimText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            this.masks.forEach((mask) => {
                trimText = trimText.replace(new RegExp(mask, 'gi'), '');
            });
            
            const wordsLenght = trimText.split(' ').length;
            if(wordsLenght > this.max_word + 1){
                const text = trimText.split(' ').slice(0, this.max_word).join(' ');
                this.masks.push(text);

                if(text.trim()){
                    this.emit("sentence", text);
                }
            }
        }
    }

    clear() {
        this.buffer = "";
    }
}

