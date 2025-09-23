'use client'

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

// Shape of the context value
const ChannelContext = createContext({
  channelName: '',
  setChannelName: () => {},
})

export const ChannelProvider = ({ children}) => {
  const [channelName, setChannelName] = useState('chogan-english');
  const [language, setLanguage] = useState('english');
  const [loadAlreadyDone, setLoadAlreadyDone] = useState(false);


  useEffect(() => {
    setChannelName(`chogan-${language}`);
  },[language])

  const getChannelName = (lang) => {
    return `chogan-${lang}`;
  }





  const value = useMemo(
    () => ({ channelName, setChannelName, language, setLanguage, loadAlreadyDone, setLoadAlreadyDone,getChannelName }),
    [channelName, language, loadAlreadyDone]
  )

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  )
}

export const useChannel = () => useContext(ChannelContext)

export { ChannelContext }


