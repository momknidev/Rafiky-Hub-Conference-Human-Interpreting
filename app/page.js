'use client'
import React from 'react'
import { AgoraRTCProvider, useRTCClient } from "agora-rtc-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import Listner from '@/components/Listner';

const Page = () => {
  const client = useRTCClient(AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));
  return (
    <AgoraRTCProvider  client={client}>
      <Listner />
    </AgoraRTCProvider>
  )
}

export default Page