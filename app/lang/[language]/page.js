// 'use client'
// import React from 'react'
// import Listner from '@/components/Listner';
// const ListenerPage = () => {

//   return <Listner />
// }

// export default ListenerPage




// 'use client'
// import React from 'react'
// import Listner from '@/components/Listner';
// const ListenerPage = () => {

//   return <Listner />
// }

// export default ListenerPage






'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✅ Dynamically import Listner (no SSR)
const Listner = dynamic(() => import('@/components/Listner'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      Loading interpretation service...
    </div>
  ),
});

export default function ListenerPage() {
  const [loadError, setLoadError] = useState(false);

  // ✅ Browser support check
  React.useEffect(() => {
    try {
      const hasWebRTC =
        typeof window !== 'undefined' &&
        (window.RTCPeerConnection ||
          window.webkitRTCPeerConnection ||
          window.mozRTCPeerConnection);

      const hasMediaDevices =
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia;

      if (!hasWebRTC || !hasMediaDevices) {
        setLoadError(true);
      }
    } catch (err) {
      console.error('Browser capability check failed:', err);
      setLoadError(true);
    }
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Your browser is not supported
          </h2>
          <p className="text-sm text-red-600 mb-6">
            This service requires WebRTC and a modern browser.  
            Please open this page in the latest version of <strong>Chrome</strong>, <strong>Firefox</strong>, or <strong>Edge</strong>.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <Listner />;
}
