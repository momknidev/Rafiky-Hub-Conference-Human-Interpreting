"use server"
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.NEXT_PUBLIC_PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

const channel_name = process.env.NEXT_PUBLIC_CHANNEL_NAME;

export async function pushMessage(event, data) {
  await pusher.trigger(channel_name, event, {
    data: data,
  });
  console.log("Message pushed successfully")
}
