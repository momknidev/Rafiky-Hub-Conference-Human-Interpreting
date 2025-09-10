'use client'
import React, { useState } from 'react'
import Listner from '@/components/Listner';
import LanguageSelect from '@/components/LanguageSelect';

const ListenerPage = () => {
  const [open, setOpen] = useState(true);

  return !open ? <Listner /> : <LanguageSelect setOpen={setOpen}/>
}

export default ListenerPage