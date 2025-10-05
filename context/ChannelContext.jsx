'use client'

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

// Shape of the context value
const ChannelContext = createContext({
  channelName: '',
  setChannelName: () => {},
})

export const ChannelProvider = ({ children}) => {
  const [channelName, setChannelName] = useState('simplied-english');
  const [language, setLanguage] = useState('english');


  useEffect(() => {
    setChannelName(`simplied-${language}`);
  },[language])

  const getChannelName = (lang) => {
    return `simplied-${lang}`;
  }





  const value = useMemo(
    () => ({ channelName, setChannelName, language, setLanguage, getChannelName }),
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


