'use client'

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

// Shape of the context value
const ChannelContext = createContext({
  channelName: '',
  setChannelName: () => {},
})

export const ChannelProvider = ({ children}) => {
  const [channelName, setChannelName] = useState('soniox-english');
  const [language, setLanguage] = useState('english');


  useEffect(() => {
    setChannelName(`soniox-${language}`);
  },[language])

  const getChannelName = (lang) => {
    return `soniox-${lang}`;
  }

  const getLanguage = () => {
    return language;
  }





  const value = useMemo(
    () => ({ channelName, setChannelName, language, setLanguage, getChannelName, getLanguage }),
    [channelName, language]
  )

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  )
}

export const useChannel = () => useContext(ChannelContext)

export { ChannelContext }


