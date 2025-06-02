import axios from "axios";



const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
const TOKEN = process.env.NEXT_PUBLIC_REST_TOKEN;

export const getBroadcastInfoRequest = async () =>  axios.get(`https://api.agora.io/dev/v1/channel/user/${APP_ID}/${CHANNEL_NAME}`, {
    headers: {
      'Authorization': `Basic ${TOKEN}`
    }
  });