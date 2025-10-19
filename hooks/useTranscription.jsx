import { getSonioxToken } from '@/services/SonioxService';
import { SonioxClient } from '@soniox/speech-to-text-web';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageBotMap } from '@/constants/captionUIDs';

const END_TOKEN = '<end>';

const isSentenceComplete = (text) => {
  if (!text || typeof text !== "string") return false;

  // 1) Trim trailing whitespace + format chars
  let s = text.replace(/[\s\p{Cf}]+$/gu, "");
  if (!s) return false;

  // 2) Strip trailing closers repeatedly: quotes/brackets, etc.
  const closers = /[)"'»”’›\]\}\)]+$/u;
  while (closers.test(s)) s = s.replace(closers, "").replace(/[\s\p{Cf}]+$/gu, "");
  if (!s) return false;

  // 3) Non-dot terminators (multilingual)
  if (/[!?]|[؟]|[۔]|[।]|[॥]$/u.test(s)) return true;

  // 4) Ellipsis
  if (/[.]{3}$/.test(s) || /…$/.test(s)) return true;

  // 5) If not ending with ".", it's not complete
  if (!/\.$/u.test(s)) return false;

  // 6) Abbreviation & initials logic for dot-terminated strings
  const tail = s.slice(Math.max(0, s.length - 40)); // recent tail
  const tailNorm = tail
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[»”’"'›\]\}\)]+/g, "");

  // Common multilingual abbreviations (extend as needed)
  const ABBR = new Set([
    // EN
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "vs.", "etc.", "e.g.", "i.e.", "est.", "dept.", "fig.", "al.",
    "no.", "comp.", "approx.", "misc.", "st.", "rd.", "ave.", "blvd.", "inc.", "ltd.", "co.", "p.m.", "a.m.",
    // ES
    "sr.", "sra.", "sres.", "dra.", "ud.", "uds.", "etc.", "p.ex.", "aprox.", "pág.", "nº.", "no.",
    // FR
    "m.", "mme.", "mlle.", "etc.", "p.ex.", "env.", "av.", "bd.", "ste.", "s.a.", "sarl.",
    // DE
    "z.b.", "u.a.", "bzw.", "usw.", "str.", "nr.", "fr.", "dr.",
    // IT
    "sig.", "sig.ra", "sig.na", "dott.", "ing.", "art.", "nr.", "no.", "ecc.",
    // RU (Cyrillic with dots)
    "г.", "ул.", "рис.", "т.д.", "т.п.", "стр.", "дол.", "руб.",
    // Hindi/Urdu (Latinized)
    "shri.", "smt.", "no.",
    // General scholarly
    "vol.", "ed.", "chap.", "ch.", "sec.", "para.", "pp.", "pg."
  ]);

  // 6a) If final token looks like a known abbreviation -> NOT complete
  // Grab run of letters/dots just before the final dot (covers "comp.", "z.b.", "t.p.", etc.)
  const abbrevWindow = s.toLowerCase().slice(0, -1).match(/([a-z\u0400-\u04ff.]+)$/iu)?.[1] ?? "";
  if (abbrevWindow && ABBR.has(abbrevWindow + ".")) return false;

  // 6b) Initials handling (without false-matching inside normal words)
  // Last token (before the final dot)
  const lastToken = s.slice(0, -1).match(/([\p{L}\p{N}.]+)$/u)?.[1] ?? "";

  // Case: single-letter last token like "A."
  if (/^\p{L}$/u.test(lastToken)) return false;

  // Case: repeated initials at the very end like "U.S." / "J.K."
  // We examine the immediate end-of-string tail only.
  const initialsTail = s.slice(Math.max(0, s.length - 8)); // enough for "A.B." etc.
  if (/(?<!\p{L})(?:\p{L}\.){2,}$/u.test(initialsTail)) return false;
  // If your JS runtime doesn't support lookbehind, replace with:
  // if ((initialsTail.match(/(?:\p{L}\.){2,}$/u)?.[0] ?? "").length > 0) {
  //   // additionally ensure the char before this run isn't a letter:
  //   const idx = initialsTail.search(/(?:\p{L}\.){2,}$/u);
  //   if (idx === 0 || !/\p{L}$/u.test(initialsTail[idx - 1])) return false;
  // }

  // Otherwise, accept the dot as a real sentence terminator
  return true;
}

// useTranscribe hook wraps Soniox speech-to-text-web SDK.
export default function useTranscribe({ onStarted = null, onFinished = null, onTranscription = null }) {
  const sonioxClient = useRef(null);

  if (sonioxClient.current == null) {
    getSonioxToken().then(apiKey => {
      sonioxClient.current = new SonioxClient({
        apiKey: apiKey,
      });
    });
  }

  const [state, setState] = useState('Init');
  const [error, setError] = useState(null);

  const startTranscription = useCallback(async (language) => {
    setError(null);

    const languageCode = LanguageBotMap[language].langCode.split('-')[0];


    sonioxClient.current?.start({
      model: 'stt-rt-preview',
      enableLanguageIdentification: false,
      enableSpeakerDiarization: true,
      enableEndpointDetection: true,
      translation: undefined,
      languageHints: [languageCode],

      onFinished: onFinished ? onFinished : () => console.log('onFinished'),
      onStarted: onStarted ? onStarted : () => console.log('onStarted'),

      onError: (status, message, errorCode) => {
        setError({ status, message, errorCode });
      },

      onStateChange: ({ newState }) => {
        console.log('newState', newState);
        setState(newState);
      },


      onPartialResult(result) {
        let newFinalTokens = '';
        for (const token of result.tokens) {
          // Ignore endpoint detection tokens
          if (token.text === END_TOKEN) {
            // onTranscription(newFinalTokens);
            // newFinalTokens = '';
            continue;
          }

          if (token.is_final) {
            console.log(token.text, "token.text");
            newFinalTokens += token.text;
          }

          console.log(`${newFinalTokens} -> ${isSentenceComplete(newFinalTokens)}`);
          if (isSentenceComplete(newFinalTokens)) {
            onTranscription(newFinalTokens);
            newFinalTokens = '';
          }
        }
      },
    });
  }, [onFinished, onStarted]);

  const stopTranscription = useCallback(() => {
    sonioxClient.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      sonioxClient.current?.cancel();
    };
  }, []);

  return {
    startTranscription,
    stopTranscription,
    state,
    error,
  };
}