'use client'
  import React, { useEffect, useState } from 'react'
import LanguageSelect from '@/components/LanguageSelect';
import LoadingBanner from '@/components/LoadingBanner';
import { useChannel } from '@/context/ChannelContext';

const ListenerPage = () => {
  const { loadAlreadyDone, setLoadAlreadyDone } = useChannel();
  useEffect(() => {
    setTimeout(() => {
      setLoadAlreadyDone(true);
    }, 5000);
  }, []);

  console.log(loadAlreadyDone);
  return !loadAlreadyDone ? <LoadingBanner/> : <LanguageSelect/>
}

export default ListenerPage