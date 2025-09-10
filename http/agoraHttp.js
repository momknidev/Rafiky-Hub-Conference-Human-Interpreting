import axios from "axios";



const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
const TOKEN = process.env.NEXT_PUBLIC_REST_TOKEN;

export const getBroadcastInfoRequest = async (CHANNEL_NAME) =>  axios.get(`https://api.agora.io/dev/v1/channel/user/${APP_ID}/${CHANNEL_NAME}`, {
    headers: {
      'Authorization': `Basic ${TOKEN}`
    }
  });