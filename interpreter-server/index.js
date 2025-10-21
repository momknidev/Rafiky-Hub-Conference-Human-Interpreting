
import express from 'express';
import expressWs from 'express-ws';
import config from 'dotenv';
config.config({path: '.env.local'});
import WebSocket from 'ws';
import { SpeechMatrixSTTService } from './services/speechMatrixService.js';
import { GoogleSTTService } from './services/googleSTTService.js';
const app = express();
expressWs(app);


export const languageToCode = {
  english: "en",
  french: "fr",
  german: "de",
  spanish: "es",
  portuguese: "pt",
  chinese: "zh",
  japanese: "ja",
  hindi: "hi",
  italian: "it",
  korean: "ko",
  dutch: "nl",
  polish: "pl",
  russian: "ru",
  swedish: "sv",
  turkish: "tr",
};


const deepgramLanguages = {
  bulgarian: "bg",
  catalan: "ca",
  czech: "cs",
  danish: "da",
  german: "de",
  greek: "el",
  english: "en-US",
  spanish: "es",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  hindi: "hi",
  hungarian: "hu",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko-KR",
  lithuanian: "lt",
  latvian: "lv",
  malay: "ms",
  dutch: "nl",
  norwegian: "no",
  polish: "pl",
  portuguese: "pt-PT",
  brazilianPortuguese: "pt-BR",
  romanian: "ro",
  russian: "ru",
  slovak: "sk",
  swedish: "sv-SE",
  tamazight: "taq",
  thai: "th-TH"
};


const openaiLanguage = {
  afrikaans: "af",
  arabic: "ar",
  azerbaijani: "az",
  belarusian: "be",
  bulgarian: "bg",
  bosnian: "bs",
  catalan: "ca",
  czech: "cs",
  welsh: "cy",
  danish: "da",
  german: "de",
  greek: "el",
  english: "en",
  spanish: "es",
  estonian: "et",
  persian: "fa",
  finnish: "fi",
  french: "fr",
  galician: "gl",
  hebrew: "he",
  hindi: "hi",
  croatian: "hr",
  hungarian: "hu",
  armenian: "hy",
  indonesian: "id",
  icelandic: "is",
  italian: "it",
  hebrew_alt: "iw",
  japanese: "ja",
  kazakh: "kk",
  kannada: "kn",
  korean: "ko",
  lithuanian: "lt",
  latvian: "lv",
  maori: "mi",
  macedonian: "mk",
  marathi: "mr",
  malay: "ms",
  nepali: "ne",
  dutch: "nl",
  norwegian: "no",
  polish: "pl",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  slovak: "sk",
  slovenian: "sl",
  serbian: "sr",
  swedish: "sv",
  swahili: "sw",
  tamil: "ta",
  thai: "th",
  tagalog: "tl",
  turkish: "tr",
  ukrainian: "uk",
  urdu: "ur",
  vietnamese: "vi",
  chinese: "zh",
};




app.ws('/interpreter', async (ws, req) => {
  const language = req.query.language;

  const config = {
    isDisconnected: false,
  }

  const sendCaption = (text) => {
    ws.send(JSON.stringify({
      type: "caption",
      transcription: text
    }))
  }
  const sttRef = await GoogleSTTService(deepgramLanguages[language],sendCaption);

  console.log(`[WebSocket] Connected - Language: ${language}`);
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    const type = data.type;
    if(type === "pong"){
      console.log("pong received");
    }else if(type === "audio"){
      const audio = data.audio;
      sttRef.sendAudio(audio);
    }
  });


  //ping
  const pingInterval = setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 3000);

  ws.on('close', () => {
    console.log('WebSocket closed');
    config.isDisconnected = true;
    clearInterval(pingInterval);
  });
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});