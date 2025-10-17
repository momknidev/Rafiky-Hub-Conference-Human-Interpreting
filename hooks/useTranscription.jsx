import { getSonioxToken } from '@/services/SonioxService';
import {
    SonioxClient
  } from '@soniox/speech-to-text-web';
  import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageBotMap } from '@/constants/captionUIDs';
  
  const END_TOKEN = '<end>';
  
  
  
  // useTranscribe hook wraps Soniox speech-to-text-web SDK.
  export default function useTranscribe({ onStarted = null, onFinished = null,onTranscription = null }) {
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
        enableLanguageIdentification: true,
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
              onTranscription(newFinalTokens);
              newFinalTokens = '';
              continue;
            }
  
            if (token.is_final) {
                newFinalTokens += token.text;
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