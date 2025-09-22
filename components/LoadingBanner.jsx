"use client"
import React, { useEffect, useState } from 'react'

const LoadingBanner = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setLoading(false);
        }, 4000);
    }, []);

    return (
        <div className='h-screen w-full bg-chogan-black flex items-center justify-center gradient-1'>
            {
                loading && (
                    <img src="/logo/Chogan.svg" alt="Loading Banner" className='w-[10rem] md:w-[12rem] object-cover' />
                )
            }
        </div>
    )
}

export default LoadingBanner