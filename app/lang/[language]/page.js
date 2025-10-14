// 'use client'
// import React from 'react'
// import Listner from '@/components/Listner';
// const ListenerPage = () => {

//   return <Listner />
// }

// export default ListenerPage






'use client';

import React, { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);


  useEffect(() => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
  }, []);

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

  function isBabelWorking() {
    try {
      // Check if Babel object exists in window (for browser runtime)
      if (window.Babel && typeof window.Babel.transform === "function") {
        console.log("✅ Babel is loaded (runtime via CDN).");
        return true;
      }
  
      // Check if JSX or modern syntax can run without compile error
      // This tests if build-time Babel (like in CRA/Vite) is working
      const test = <div>Test Babel</div>;
      if (test && test.type === 'div') {
        console.log("✅ JSX is compiled — Babel (or similar) is working!");
        return true;
      }
  
      console.warn("❌ Babel not working — JSX likely not compiled.");
      return false;
    } catch (err) {
      console.error("❌ Babel check failed:", err);
      return false;
    }
  }



  
  if ((loadError || !isBabelWorking()) && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            ⚠️ Unable to join the event
          </h2>
          <div>
            <p className="text-sm text-gray-800 mb-6">
              Your browser or connection may not fully support the platform.
              <br />
              Try this:
            </p>
            <ul className="text-sm text-gray-800 mb-6">
              <li>Refresh the page.</li>
              <li>If it still fails, open the link in your system browser (Android: Chrome; iPhone/iPad: Safari).</li>
              <li>Make sure you have a stable connection (Wi-Fi or 4G/5G).</li>
              <li>If the issue persists, please contact event support.</li>
            </ul>
          </div>
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
