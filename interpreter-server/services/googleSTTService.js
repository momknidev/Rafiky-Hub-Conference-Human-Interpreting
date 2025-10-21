import { SpeechClient } from "@google-cloud/speech";

export const GoogleSTTService = async (language, sendCaption) => {
  const client = new SpeechClient({
    keyFilename: "credentials.json",
  });

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

        // console.log(`[GOOGLE STT] ${isFinal ? "Final" : "Interim"}:`, transcript);
        if (isFinal){
            sendCaption(transcript);
            console.log(`[GOOGLE STT]: ${transcript}`);
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

