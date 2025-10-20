import { createSpeechmaticsJWT } from "@speechmatics/auth";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { config } from 'dotenv';
config({ path: '.env.local' });
import pkg from "speechmatics";
const {MaxDelayModeConfig, OperatingPoint}  = pkg;


const SpeechmaticsEvents = {
    ADD_TRANSCRIPT: "AddTranscript",
    END_TRANSCRIPT: "EndOfTranscript",
    PART_TRANSCRIPT: "AddPartialTranscript",
    ERROR: "Error",
    ADD_TRANSLATION: "AddTranslation",
    PART_TRANSLATION: "AddPartialTranslation",
}
const SPEECHMATICS_MAX_DELAY = 1.0;
const END_OF_SENTENCE_SYMBOLS = [`.`, `?`, `。`, `!`, `？`, `！`, `।`,]


export const SpeechMatrixSTTService = async (language,sendCaption) => {
    const apiKey = process.env.SPEECHMATRICS_API_KEY;
    const client = new RealtimeClient();
    let isTranscrabing = false;
    let text = "";
    let timeoutRef = null;

    client.addEventListener("receiveMessage", ({ data }) => {
        if (!data) {
            console.log("[SpeechmaticsRecorgnizer] no data received");
            return;
        }

        if (data.message === SpeechmaticsEvents.PART_TRANSCRIPT) {
            console.log(`data.metadata.transcript -> ${data.metadata.transcript}`)
        } else if (data.message === SpeechmaticsEvents.ADD_TRANSCRIPT) {
            const is_eos = data.results.length > 0 ? data.results[0].is_eos : false
            const transcript = data?.metadata?.transcript ?? '';
            if (!transcript) {
                return;
            }


            if(timeoutRef) clearImmediate(timeoutRef)

            timeoutRef = setTimeout(() => {
                if(text){
                    console.log(`[text] -> ${text} by timeout`)
                    sendCaption(text)
                    text = ''
                }
            }, 8000);

            text += transcript
            const endOfSentence = END_OF_SENTENCE_SYMBOLS.find(s => transcript.includes(s));
            if (endOfSentence) {
                console.log(`[text] -> ${text} by endOfSentence`);

                // for this case Done. Think
                const [main,other] = text.split(endOfSentence)
                sendCaption(`${main}${endOfSentence}`)
                text = other.trim()
            }

            if(is_eos){
                if(text) {
                    console.log(`[text] -> ${text} by endOfSpeech`)
                    sendCaption(text)
                }
            }
        }
    });

    const jwt = await createSpeechmaticsJWT({
        type: "rt",
        apiKey,
        ttl: 60, // 1 minute
    });

    await client.start(jwt, {
        transcription_config: {
            language: language,
            operating_point: OperatingPoint.Enhanced,
            enable_partials: false,
            max_delay: SPEECHMATICS_MAX_DELAY,
            max_delay_mode: MaxDelayModeConfig.Flexible,
        },
        audio_format: {
            type: "raw",
            sample_rate: 24000,
            encoding: "pcm_s16le"
        },
    });
    isTranscrabing = true;
    const sendAudio = async (audio) => {
        if(!isTranscrabing) return;
        client.sendAudio(Buffer.from(audio, 'base64'));
    }

    const stop = async () => {
        isTranscrabing = false;
        client.stopRecognition();
    }

 
    return {
        sendAudio,
        stop,
        ws: {
            readyState: isTranscrabing ? WebSocket.OPEN : WebSocket.CLOSED,
        }
    }
}

