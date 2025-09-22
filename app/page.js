'use client'
  import React, { useEffect, useState } from 'react'
import LanguageSelect from '@/components/LanguageSelect';
import LoadingBanner from '@/components/LoadingBanner';

const ListenerPage = () => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 5000);
  }, []);
  return loading ? <LoadingBanner/> : <LanguageSelect/>
}

export default ListenerPage