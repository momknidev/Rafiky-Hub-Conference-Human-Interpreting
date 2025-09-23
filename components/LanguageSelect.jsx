import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { flagsMapping, languages } from '@/constants/flagsMapping';
import Link from 'next/link';
const LanguageSelect = () => {
  useEffect(() => {
    window.document.title = `Language Select`;
  }, []);

  return (
    <div className='h-screen w-screen gradient-2 flex flex-col items-center justify-start py-10 px-8 pt-20 overflow-y-auto'>
      <img src="/logo/livello.svg" alt="Livello Logo" className='w-[14rem] md:w-[17rem] object-cover' />

      <div className='w-full flex flex-col items-center justify-start mt-10'>
        <h1 className='text-white text-2xl md:text-4xl uppercase language-title'>Choose your language</h1>
        <p className='text-white/80 mt-2 text-lg font-light'>Translate the event in your language</p>
      </div>

      <div className='w-full flex flex-col items-center justify-start mt-10'>
        <div className='w-full grid grid-cols-2 md:grid-cols-3 gap-5'>
          {
            languages.map((language) => (
              <Link href={`/lang/${language.value}`} key={language.value}>
                <div className='flex items-center justify-start gap-2 flex-col my-2'>
                  <img src={language.flag} alt={language.name} className='w-[130px] h-[130px] rounded-full object-cover' />
                  <p className='text-white text-lg font-normal'>{language.name}</p>
                </div>
              </Link>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default LanguageSelect