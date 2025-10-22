import { SpeechClient } from "@google-cloud/speech";
import { ChunkedSentenceStream } from "./CaptionChunkerService.js";

export const GoogleSTTService = async (language, sendCaption) => {
  let list = [];
  let isStarted = false;
  const client = new SpeechClient({
    keyFilename: "credentials.json",
  });

  const chunkedSentenceStream = new ChunkedSentenceStream(10);

  chunkedSentenceStream.on("sentence", (sentence) => {
    console.log(`[GOOGLE STT] Sentence: ${sentence}`);
    sendCaption(sentence);
    list.push(sentence);
    if(!isStarted){
      startPusher();
    }
  });

  const startPusher = () => {
    if(list.length > 0){
      isStarted = true;
      const sentence = list.shift();
      const timeoutDuration = Math.max(2.0,0.06 * sentence.length);
      setTimeout(() => {
        sendCaption(sentence);
      }, timeoutDuration * 1000);
    }else{
      isStarted = false;
    }
  }

  // ✅ Create a bidirectional stream (not a promise)
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: language,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        maxAlternatives: 1,
        model: "default",
      },
      interimResults: true,
      singleUtterance: false,
    })
    .on("data", (data) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const transcript = data.results[0].alternatives[0].transcript;
        const isFinal = data.results[0].isFinal;

        if (isFinal){
            chunkedSentenceStream.pushDelta(transcript, true);
        }else{
            chunkedSentenceStream.pushDelta(transcript, false);
        }
      }
    })
    .on("error", (error) => {
      console.error("[GOOGLE STT ERROR]", error);
    })
    .on("end", () => {
      console.log("[GOOGLE STT] Stream ended");
    });

  // ✅ Function to push audio chunks to the recognizer
  const sendAudio = (audioBase64) => {
    const buffer = Buffer.from(audioBase64, "base64");
    recognizeStream.write(buffer);
  };

  // ✅ Properly close the stream
  const stop = () => {
    recognizeStream.end();
  };

  return {
    sendAudio,
    stop,
  };
};
