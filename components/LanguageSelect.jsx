import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {useRouter} from 'next/navigation'
import { languages, flagsMapping } from '@/constants/flagsMapping'
const LanguageSelect = () => {
  const [language, setLanguage] = useState('english');
  const router = useRouter();
  return (
    <div className='h-screen w-screen flex items-center justify-center'>
        <Card className='w-full max-w-xl bg-white border-0 rounded-2xl'>
            <CardHeader>
                <img src="/images/atk-logo.jpg" alt="ATK Logo" width={100} height={100} className='!w-[50%] h-auto mx-auto mb-5'/>
            </CardHeader>
            <CardContent>
                <label className='text-zero-text/70 font-medium block mb-1'>Select Language</label>
                <Select defaultValue='english' onValueChange={(value) => setLanguage(value)} className='w-full'>
                    <SelectTrigger className='cursor-pointer w-full border-gray-400'>
                        <SelectValue placeholder='Select Language' className='text-black w-[600px] bg-white border-gray-400'/>
                    </SelectTrigger>
                    <SelectContent className='bg-white border-none shadow-md'>
                        {
                            languages.map((language) => (
                                <SelectItem value={language.value} className='cursor-pointer flex items-center gap-2'>
                                    <img src={flagsMapping[language.value]} alt={language.name} className='w-4 h-4 mr-2'/>
                                    <span>{language.name}</span>
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
                <Button onClick={() => router.push(`/listen/${language}`)} className='w-full mt-4 bg-zero-green text-white cursor-pointer hover:bg-zero-green/90'>Join</Button>
            </CardContent>
        </Card>
    </div>
  )
}

export default LanguageSelect