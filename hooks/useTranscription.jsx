import { getSonioxToken } from '@/services/SonioxService';
import { SonioxClient } from '@soniox/speech-to-text-web';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageBotMap } from '@/constants/captionUIDs';

const END_TOKEN = '<end>';
const COMMIT_DEBOUNCE_MS = 800; 




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
  const finalLineRef = useRef('');    
  const liveLineRef = useRef('');    
  const debounceTimer = useRef(null);

  const clearCommitTimer = useCallback(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const commitLine = useCallback(() => {
    const line = finalLineRef.current.trim();
    if (line) {
      onTranscription?.(line);   
    }
    finalLineRef.current = '';
    liveLineRef.current = '';
  }, [onTranscription]);

  const scheduleCommit = useCallback(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      commitLine();
      debounceTimer.current = null;
    }, COMMIT_DEBOUNCE_MS);
  }, [commitLine]);

  const safeAppend = (buf, tokenText) => {
    if (!tokenText) return buf;
    const t = tokenText
      .replace(/\s+([,.;:!?…])/g, '$1') 
      .replace(/\s+/g, ' ');            

    if (buf.endsWith(' ') && /^[,.;:!?…]/.test(t)) {
      return buf.slice(0, -1) + t;      
    }
    if (buf && !buf.endsWith(' ') && !/^[,.;:!?…]/.test(t)) {
      return buf + ' ' + t;             
    }
    return (buf || '') + t;
  };


  // const startTranscription = useCallback(async (language) => {
  //   setError(null);

  //   const languageCode = LanguageBotMap[language].langCode.split('-')[0];


  //   sonioxClient.current?.start({
  //     model: 'stt-rt-preview',
  //     enableLanguageIdentification: false,
  //     enableSpeakerDiarization: true,
  //     enableEndpointDetection: true,
  //     translation: undefined,
  //     languageHints: [languageCode],

  //     onFinished: onFinished ? onFinished : () => console.log('onFinished'),
  //     onStarted: onStarted ? onStarted : () => console.log('onStarted'),

  //     onError: (status, message, errorCode) => {
  //       setError({ status, message, errorCode });
  //     },

  //     onStateChange: ({ newState }) => {
  //       console.log('newState', newState);
  //       setState(newState);
  //     },


  //     onPartialResult(result) {
  //       let newFinalTokens = '';
  //       for (const token of result.tokens) {
  //         // Ignore endpoint detection tokens
  //         if (token.text === END_TOKEN) {
  //           onTranscription(newFinalTokens);
  //           newFinalTokens = '';
  //           continue;
  //         }

  //         if (token.is_final) {
  //           console.log(token.text, "token.text");
  //           newFinalTokens += token.text;
  //         }


  //       }
  //     },
  //   });
  // }, [onFinished, onStarted]);




  const startTranscription = useCallback(async (language) => {
    setError(null);
  
    const languageCode = LanguageBotMap[language].langCode.split('-')[0];
  
    // reset buffers on start
    finalLineRef.current = '';
    liveLineRef.current = '';
    clearCommitTimer?.();
  
    // (optional) choose model by language
    const model = 'stt-rt-preview';
  
    sonioxClient.current?.start({
      model,
      enableLanguageIdentification: false,   
      enableSpeakerDiarization: false,       
      enableEndpointDetection: true,
      translation: undefined,
      languageHints: [languageCode],
  
      onStarted: onStarted ? onStarted : () => console.log('onStarted'),
      onFinished: () => {
        commitLine();
        onFinished ? onFinished() : console.log('onFinished');
      },
  
      onError: (status, message, errorCode) => {
        setState('Error');
        setError({ status, message, errorCode });
      },
  
      onStateChange: ({ newState }) => {
        console.log('newState', newState);
        setState(newState);
      },
  
      // 🔑 Fires a lot; append only FINAL tokens to a persistent buffer.
      onPartialResult(result) {
        try {
          // Optional live preview (replace-in-place; NO new bullet)
          const liveStr = (result?.text ?? result?.transcript ?? '').toString().trim();
          if (liveStr && liveStr !== liveLineRef.current) {
            liveLineRef.current = liveStr;
            // if you have a live updater, call it here:
            // onLiveUpdate?.(liveStr);
          }
  
          // Different SDKs expose endpoint differently
          const endpointFlag =
            result?.is_endpoint ||
            result?.endpointed ||
            result?.end_of_utterance === true;
  
          let appendedFinal = false;
  
          // Prefer token-wise handling if available
          if (Array.isArray(result?.tokens)) {
            for (const token of result.tokens) {
              // Treat explicit END token as a hard endpoint
              if (token?.text === (typeof END_TOKEN !== 'undefined' ? END_TOKEN : END_TOKEN_FALLBACK)) {
                commitLine();
                clearCommitTimer();
                continue;
              }
              if (token?.is_final) {
                // finalLineRef.current = safeAppend(finalLineRef.current, token.text);
                finalLineRef.current += token.text;
                appendedFinal = true;
              }
            }
          } else if (result?.is_final && typeof result?.text === 'string') {
            // Some variants emit a full final string instead of per-token finals
            finalLineRef.current += result.text;
            appendedFinal = true;
          }
  
          // Commit policy
          if (endpointFlag) {
            // Engine says: utterance ended -> commit immediately
            commitLine();
            clearCommitTimer();
            return;
          }
  
          if (appendedFinal) {
            // No hard endpoint yet -> debounce commit on short silence
            scheduleCommit();
          }
        } catch (e) {
          console.warn('onPartialResult handler error:', e);
        }
      },
    });
  }, [onFinished, onStarted, commitLine, scheduleCommit, clearCommitTimer]);

  

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