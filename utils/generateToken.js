"use server"
import { RtcTokenBuilder,RtcRole } from 'agora-token';



export async function generateToken(user){
    const appID = process.env.NEXT_PUBLIC_AGORA_APPID;
    const appCertificate = process.env.NEXT_PUBLIC_AGORA_CERT;
    const channelName = process.env.NEXT_PUBLIC_CHANNEL_NAME;
    const uid = Math.floor(Math.random() * 1000000);
    const role = user == "PUBLISHER" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expirationTimeInSeconds = 3600;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
    appID, appCertificate, channelName, uid, role, privilegeExpiredTs
    );
    return {token,uid}
}

