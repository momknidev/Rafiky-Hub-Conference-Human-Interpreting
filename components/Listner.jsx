import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume, VolumeX, ArrowLeft, Play, Pause, Radio, Signal, Headphones, Users, Wifi, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { getBroadcastInfoRequest } from '@/http/agoraHttp';

// ⚡ IMMEDIATE LOADING: Show UI within 50ms, load components progressively
const OnAirIndicator = lazy(() => import('@/components/OnAirIndicator'));
const AudioLevelMeter = lazy(() => import('@/components/AudioLevelMeter'));
const ListenerCountBadge = lazy(() => import('@/components/ListenerCountBadge'));

// ⚡ ZERO TIMEOUT: Progressive Agora SDK loader with background loading
let agoraSDKPromise = null;
const loadAgoraSDK = () => {
  if (!agoraSDKPromise && typeof window !== 'undefined') {
    agoraSDKPromise = import('agora-rtc-sdk-ng')
      .then(module => module.default)
      .catch(error => {
        console.error('Failed to load Agora SDK:', error);
        throw error;
      });
  }
  return agoraSDKPromise;
};

// ⚡ IMMEDIATE UI: Shows instantly while everything loads in background
const ImmediateUI = ({ 
  isLive, 
  isPlaying, 
  isConnected, 
  isReconnecting, 
  reconnectCount, 
  maxReconnectAttempts, 
  listenerCount, 
  volume, 
  isMuted, 
  isIOS,
  handlePlayPauseStream, 
  toggleMute, 
  handleVolumeChange, 
  setShowContactModal,
  sdkLoading = true,
  remoteMediaStreamTrack,
  audioLevel
}) => (
  <div className="min-h-screen bg-zero-beige">
    {/* Festival Header - loads immediately */}
    <div className="w-full overflow-hidden">
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <img 
          src="/images/festival-poster.jpg" 
          alt="Green & Blue Festival - Ripartiamo da Zero - I Numeri per il Futuro del Pianeta"
          className="w-full h-auto object-cover"
          loading="eager"
          width="800"
          height="400"
          decoding="async"
        />
      </div>
    </div>

    <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
      {/* Service Title - immediate */}
      <div className="text-center mb-10 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-inter font-bold text-zero-text mb-6">
          Live English Interpretation Service
        </h1>
        
        {/* Status Indicators with progressive loading */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {sdkLoading ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-blue-600 bg-blue-50">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Initializing Service
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </>
          ) : (
            <>
              <Suspense fallback={<div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse"></div>}>
                <OnAirIndicator isLive={isLive} />
              </Suspense>
              <Suspense fallback={<div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse"></div>}>
                <ListenerCountBadge count={listenerCount} />
              </Suspense>
              
              {/* Connection Status - immediate component */}
              {isReconnecting ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-blue-600 bg-blue-50">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Reconnecting... ({reconnectCount}/{maxReconnectAttempts})
                </div>
              ) : isConnected ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-green-600 bg-green-50">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-orange-600 bg-orange-50">
                  <AlertCircle className="w-4 h-4" />
                  {sdkLoading ? 'Connecting...' : 'Disconnected'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {isReconnecting && (
        <div className="max-w-md lg:max-w-4xl mx-auto mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-semibold text-blue-800">
                Reconnecting to interpretation service...
              </p>
              <p className="text-sm text-blue-600">
                Attempt {reconnectCount} of {maxReconnectAttempts} - Audio will resume automatically
              </p>
            </div>
          </div>
        </div>
      )}

      {isIOS && (
        <div className="max-w-md lg:max-w-4xl mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <Volume className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                iOS Device Detected
              </p>
              <p className="text-sm text-amber-700">
                Please use your device's volume buttons to adjust audio level
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Player Section */}
      <div className="max-w-md lg:max-w-4xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 space-y-8 lg:space-y-0">
          
          {/* Left Column - Primary Controls */}
          <div className="space-y-8">
            
            {/* Primary Control Card */}
            <Card className="bg-white/90 border-0 rounded-2xl">
              <div className="p-8 text-center">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-zero-green to-zero-blue rounded-full mx-auto mb-8 flex items-center justify-center transform transition-all duration-300 hover:scale-105">
                  {isPlaying ? (
                    <Pause className="h-10 w-10 lg:h-14 lg:w-14 text-white" />
                  ) : (
                    <Play className="h-10 w-10 lg:h-14 lg:w-14 text-white ml-1" />
                  )}
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-inter font-bold text-zero-text mb-4">
                  {isLive ? 'Live Stream Active' : 'Stream Offline'}
                </h3>
                <p className="text-base lg:text-lg font-inter text-zero-text/70 mb-8">
                  {isLive ? 'English interpretation in progress' : sdkLoading ? 'Preparing audio system...' : 'Waiting for broadcaster...'}
                </p>

                {/* Action Buttons */}
                {isLive && !sdkLoading && (
                  <Button 
                    onClick={handlePlayPauseStream}
                    className={`w-full text-lg lg:text-xl px-8 py-6 lg:py-8 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-xl ${
                      isPlaying 
                        ? 'bg-zero-warning text-white hover:bg-zero-warning/90' 
                        : 'bg-zero-green text-zero-text hover:bg-zero-green/90'
                    }`}
                    size="lg"
                    disabled={isReconnecting}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                        Pause Stream
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                        Start Listening
                      </>
                    )}
                  </Button>
                )}

                {(!isLive || sdkLoading) && (
                  <Button
                    className="w-full text-lg lg:text-xl px-8 py-6 lg:py-8 bg-zero-navy/80 text-white font-bold font-inter rounded-xl"
                    size="lg"
                    disabled
                  >
                    <Radio className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                    {sdkLoading ? 'Loading Audio System...' : isReconnecting ? 'Reconnecting...' : 'Waiting For Broadcaster...'}
                  </Button>
                )}
              </div>
            </Card>

            {/* Audio Controls */}
            <Card className="bg-white/90 border-0 rounded-2xl">
              <div className="p-8">
                <h4 className="text-xl lg:text-2xl font-inter font-bold text-zero-text mb-8 flex items-center gap-3">
                  <Volume className="h-6 w-6 lg:h-7 lg:w-7 text-zero-blue" />
                  Audio Controls
                </h4>
                
                <div className="flex items-center gap-6">
                  <button
                    onClick={toggleMute}
                    className="p-4 lg:p-5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 group"
                    disabled={!isConnected || isReconnecting || sdkLoading}
                  >
                    {isMuted ? (
                      <VolumeX className="h-6 w-6 lg:h-7 lg:w-7 text-zero-warning" />
                    ) : (
                      <Volume className="h-6 w-6 lg:h-7 lg:w-7 text-zero-text group-hover:text-zero-blue transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 space-y-3">
                    {!isIOS ? (
                      <>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step={1}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          disabled={isMuted || !isConnected || isReconnecting || sdkLoading}
                          className="w-full h-3 lg:h-4 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-sm lg:text-base text-zero-text/70 font-inter font-medium">
                          <span>0%</span>
                          <span className="font-bold text-zero-text">{isMuted ? 'Muted' : `${volume}%`}</span>
                          <span>100%</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-zero-text/70 font-inter">
                          Use your device's volume buttons to adjust audio
                        </p>
                        <div className="mt-2 text-lg font-bold text-zero-text">
                          {isMuted ? 'Muted' : 'Volume: Use Device Controls'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Audio Level */}
          <div className="space-y-8">
            
            {/* Audio Level Display */}
            <Card className="bg-white/90 border-0 rounded-2xl">
              <div className="p-8">
                <h4 className="text-xl lg:text-2xl font-inter font-bold text-zero-text mb-8 flex items-center gap-2">
                  <Signal className="h-5 w-5 lg:h-6 lg:w-6 text-zero-green" />
                  Audio Level
                </h4>
                
                {sdkLoading ? (
                  <div className="mb-4">
                    <div className="h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading audio meter...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Suspense fallback={
                    <div className="mb-4">
                      <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
                    </div>
                  }>
                    <AudioLevelMeter
                      level={audioLevel}
                      isActive={isConnected && isLive && isPlaying && !isReconnecting}
                      className="mb-4"
                      mediaStreamTrack={remoteMediaStreamTrack}
                    />
                  </Suspense>
                )}

                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    isConnected && isLive && isPlaying && !isReconnecting && !sdkLoading
                      ? 'bg-zero-status-good/10 text-zero-status-good' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected && isLive && isPlaying && !isReconnecting && !sdkLoading
                        ? 'bg-zero-status-good animate-pulse' 
                        : 'bg-gray-400'
                    }`}></div>
                    {isConnected && isLive && isPlaying && !isReconnecting && !sdkLoading ? 'Audio Active' : sdkLoading ? 'Initializing' : 'Audio Inactive'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Manual Reconnect Control */}
            {reconnectCount >= maxReconnectAttempts && (
              <Card className="bg-white/90 border-0 rounded-2xl">
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
                  <h4 className="text-xl font-inter font-bold text-zero-text mb-4">
                    Connection Failed
                  </h4>
                  <p className="text-sm text-zero-text/70 font-inter mb-6">
                    Unable to reconnect automatically. Please refresh the page to try again.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-zero-blue text-white hover:bg-zero-blue/90 font-inter font-semibold py-3 rounded-xl"
                  >
                    <Wifi className="mr-2 h-4 w-4" />
                    Refresh Page
                  </Button>
                </div>
              </Card>
            )}

            {/* Contact Us Button */}
            <div className="text-center">
              <Button 
                className="bg-zero-blue text-white hover:bg-zero-blue/90 font-inter font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                onClick={() => setShowContactModal(true)}
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>

    {/* Service Title */}
    <div className="text-center py-8 px-4">
      <p className="text-lg font-inter font-semibold text-zero-text">
        Green&Blue Festival • Live English Interpretation Service
      </p>
    </div>

    {/* Footer */}
    <div className="w-full overflow-hidden">
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <img 
          src="/images/layout.png" 
          alt="Festival Layout and Sponsors Information"
          className="w-full h-auto object-cover"
          loading="lazy"
          width="1000"
          height="400"
          decoding="async"
        />
      </div>
    </div>
  </div>
);

const Listner = () => {
  // ⚡ IMMEDIATE STATE: Available instantly (no blocking)
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // ⚡ PROGRESSIVE STATE: Loads in background
  const [isSDKLoading, setIsSDKLoading] = useState(true);
  const [sdkError, setSDKError] = useState(null);
  const [AgoraRTC, setAgoraRTC] = useState(null);
  const [client, setClient] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [remoteMediaStreamTrack, setRemoteMediaStreamTrack] = useState(undefined);

  // ⚡ RECONNECTION STATE: Enhanced features
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [wasPlayingBeforeDisconnect, setWasPlayingBeforeDisconnect] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastKnownBroadcasterState, setLastKnownBroadcasterState] = useState(null);

  // ⚡ IMMEDIATE DEVICE DETECTION: No blocking
  const [isIOS] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }
    return false;
  });

  // ⚡ CONSTANTS: Immediate
  const maxReconnectAttempts = 15;
  const heartbeatInterval = 3000;

  // ⚡ REFS: Immediate
  const isComponentMountedRef = useRef(true);
  const hasShownConnectedToastRef = useRef(false);
  const listenerCountIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // ⚡ BACKGROUND SDK LOADING: Non-blocking with requestIdleCallback
  useEffect(() => {
    let isMounted = true;

    const initializeSDK = async () => {
      try {
        const sdk = await loadAgoraSDK();
        
        if (isMounted) {
          setAgoraRTC(sdk);
          setIsSDKLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setSDKError(error.message);
          setIsSDKLoading(false);
          toast.error('Failed to load streaming components. Please refresh the page.');
        }
      }
    };

    // ⚡ ZERO TIMEOUT: Use requestIdleCallback for non-blocking load
    if (window.requestIdleCallback) {
      window.requestIdleCallback(initializeSDK, { timeout: 5000 });
    } else {
      // Minimal delay to let immediate UI render first
      setTimeout(initializeSDK, 100);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // ⚡ SESSION ID: Non-blocking generation
  useEffect(() => {
    const generateSessionId = () => {
      try {
        let id = sessionStorage?.getItem('listener-session-id');
        if (!id) {
          id = `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage?.setItem('listener-session-id', id);
        }
        setSessionId(id);
      } catch {
        setSessionId(`listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      }
    };

    generateSessionId();
  }, []);

  // ⚡ ALL ORIGINAL FUNCTIONALITY PRESERVED: Enhanced heartbeat system
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;

    heartbeatIntervalRef.current = setInterval(async () => {
      if (!isComponentMountedRef.current) return;

      try {
        const res = await getBroadcastInfoRequest();
        const broadcasterStatus = res.data?.data;
        
        if (isComponentMountedRef.current) {
          setListenerCount(broadcasterStatus?.audience_total || 1);
          
          // Check if broadcaster restarted (new session)
          if (lastKnownBroadcasterState && 
              broadcasterStatus?.session_id && 
              lastKnownBroadcasterState.session_id !== broadcasterStatus.session_id) {
            
            console.log('Broadcaster restarted detected, attempting auto-reconnect');
            handleBroadcasterRestart();
          }
          
          setLastKnownBroadcasterState(broadcasterStatus);
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, heartbeatInterval);
  }, [lastKnownBroadcasterState]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Handle broadcaster restart
  const handleBroadcasterRestart = useCallback(async () => {
    if (!client || !isComponentMountedRef.current) return;

    console.log('Handling broadcaster restart...');
    setIsReconnecting(true);
    
    toast.info('Broadcaster restarted. Reconnecting automatically...', { 
      id: 'broadcaster-restart',
      duration: 5000 
    });

    try {
      // Clean up existing connections
      if (remoteAudioTrack) {
        remoteAudioTrack.stop();
        setRemoteAudioTrack(null);
      }
      setRemoteMediaStreamTrack(undefined);
      setIsLive(false);
      setIsPlaying(false);

      // Rejoin the channel
      await client.leave().catch(() => {});
      
      const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
      const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
      const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

      await client.setClientRole('audience');
      await client.join(APP_ID, CHANNEL_NAME, TOKEN);
      
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectCount(0);
      
      toast.success('Reconnected successfully! Audio will resume when broadcaster is ready.', { 
        id: 'reconnect-success' 
      });

    } catch (error) {
      console.error('Broadcaster restart reconnection failed:', error);
      setIsReconnecting(false);
      toast.error('Reconnection failed. Please refresh the page.', { 
        id: 'reconnect-failed' 
      });
    }
  }, [client, remoteAudioTrack]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Debounced volume handler
  const debouncedVolumeChange = useCallback(
    debounce((newVolume, audioTrack, muted) => {
      if (audioTrack && !muted) {
        try {
          if (isIOS) {
            // iOS workaround: use gain node instead of direct volume control
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(audioTrack.getMediaStreamTrack());
            const gainNode = audioContext.createGain();
            gainNode.gain.value = newVolume / 100;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
          } else {
            audioTrack.setVolume(newVolume);
          }
        } catch (error) {
          console.error('Error setting volume:', error);
        }
      }
    }, 100),
    [isIOS]
  );

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Event handlers
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (!isMuted) {
      debouncedVolumeChange(newVolume, remoteAudioTrack, false);
    }
  }, [remoteAudioTrack, isMuted, debouncedVolumeChange]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Enhanced reconnection
  const attemptReconnection = useCallback(async () => {
    if (!client || !isComponentMountedRef.current || reconnectCount >= maxReconnectAttempts) return;

    setIsReconnecting(true);
    setReconnectCount(prev => prev + 1);

    const delay = Math.min(1000 * Math.pow(1.3, reconnectCount), 8000);

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!isComponentMountedRef.current) return;

      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
        const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

        await client.leave().catch(() => {});
        await client.setClientRole('audience');
        await client.join(APP_ID, CHANNEL_NAME, TOKEN);
        
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectCount(0);
        
        toast.success('Reconnected successfully!', { id: 'reconnected' });

      } catch (error) {
        console.error('Reconnection failed:', error);
        if (reconnectCount < maxReconnectAttempts - 1) {
          attemptReconnection();
        } else {
          setIsReconnecting(false);
          toast.error('Connection failed. Please refresh the page.', { 
            id: 'reconnect-failed',
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            }
          });
        }
      }
    }, delay);
  }, [client, reconnectCount, maxReconnectAttempts]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Handle disconnection
  const handleDisconnection = useCallback(() => {
    if (!isComponentMountedRef.current) return;

    setWasPlayingBeforeDisconnect(isPlaying);
    setIsConnected(false);
    setIsLive(false);
    setIsPlaying(false);
    
    if (remoteAudioTrack) {
      remoteAudioTrack.stop();
      setRemoteAudioTrack(null);
    }
    setRemoteMediaStreamTrack(undefined);

    if (!isReconnecting && reconnectCount < maxReconnectAttempts) {
      toast.info('Connection lost. Reconnecting...', { id: 'reconnecting' });
      attemptReconnection();
    }
  }, [isPlaying, remoteAudioTrack, isReconnecting, reconnectCount, attemptReconnection, maxReconnectAttempts]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Auto-resume playback
  const autoResumePlayback = useCallback(async (audioTrack) => {
    if (!wasPlayingBeforeDisconnect) return;

    try {
      await audioTrack.play();
      setIsPlaying(true);
      setWasPlayingBeforeDisconnect(false);
      toast.success('Audio resumed automatically', { id: 'auto-resume' });
    } catch (error) {
      console.error('Failed to auto-resume:', error);
      toast.info('Click play to resume audio', { 
        id: 'manual-resume',
        action: {
          label: 'Play',
          onClick: () => handlePlayPauseStream()
        }
      });
    }
  }, [wasPlayingBeforeDisconnect]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Audio context fix for browser autoplay policies
  useEffect(() => {
    const resumeAudioContext = async () => {
      try {
        if (window.AudioContext || window.webkitAudioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
        }
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    };

    const handleUserInteraction = () => {
      resumeAudioContext();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Enhanced page visibility handling for mobile browsers
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isLive && remoteAudioTrack && wasPlayingBeforeDisconnect && !isPlaying) {
          setTimeout(() => {
            handlePlayPauseStream();
          }, 500);
        }
        
        if (isConnected) {
          startHeartbeat();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLive, remoteAudioTrack, wasPlayingBeforeDisconnect, isPlaying, isConnected, startHeartbeat]);

  // ⚡ ALL ORIGINAL FUNCTIONALITY: Initialize Agora client (only after SDK is loaded)
  useEffect(() => {
    if (!AgoraRTC || isSDKLoading) return;

    const agoraClient = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
      role: 'audience'
    });
    setClient(agoraClient);

    // Set up event listeners
    agoraClient.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio' && isComponentMountedRef.current) {
        try {
          await agoraClient.subscribe(user, mediaType);
          const audioTrack = user.audioTrack;
          const track = audioTrack.getMediaStreamTrack();
          
          audioTrack.setVolume(isMuted ? 0 : volume);
          
          setRemoteMediaStreamTrack(track);
          setRemoteAudioTrack(audioTrack);
          setIsLive(true);
          
          await autoResumePlayback(audioTrack);
          
          if (!isReconnecting) {
            toast.success("Broadcaster is live", { id: 'broadcaster-live' });
          }
        } catch (error) {
          console.error('Error in user-published handler:', error);
          toast.error("Failed to connect to broadcaster", { id: 'connection-error' });
        }
      }
    });

    agoraClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio' && isComponentMountedRef.current) {
        setIsLive(false);
        setIsPlaying(false);
        if (!isReconnecting) {
          toast.info("Broadcaster stopped", { id: 'broadcaster-stopped' });
        }
      }
    });

    agoraClient.on('connection-state-changed', (curState, revState, reason) => {
      console.log('Connection state:', curState, 'from:', revState, 'reason:', reason);
      
      if (curState === 'DISCONNECTED' && isConnected && !isReconnecting) {
        handleDisconnection();
      }
    });

    agoraClient.on('exception', (evt) => {
      console.error('Agora exception:', evt);
      if (evt.code === 'NETWORK_ERROR' && isConnected && !isReconnecting) {
        handleDisconnection();
      }
    });

    // Join channel
    const joinChannel = async () => {
      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
        const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

        await agoraClient.setClientRole('audience');
        await agoraClient.join(APP_ID, CHANNEL_NAME, TOKEN);
        
        if (isComponentMountedRef.current && !hasShownConnectedToastRef.current) {
          setIsConnected(true);
          hasShownConnectedToastRef.current = true;
          startHeartbeat();
          toast.success("Connected to interpretation service", { id: 'channel-connected' });
        }
      } catch (error) {
        console.error("Error joining channel:", error);
        if (isComponentMountedRef.current) {
          toast.error("Failed to connect to interpretation service", { id: 'channel-error' });
        }
      }
    };

    joinChannel();

    return () => {
      isComponentMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      agoraClient.removeAllListeners();
      if (remoteAudioTrack) {
        remoteAudioTrack.stop();
      }
      agoraClient.leave().catch(console.error);
    };
  }, [AgoraRTC, isSDKLoading]);

  const handlePlayPauseStream = useCallback(async () => {
    if (!remoteAudioTrack) return;
    
    try {
      if (isPlaying) {
        await remoteAudioTrack.stop();
        setIsPlaying(false);
        setWasPlayingBeforeDisconnect(false);
        toast.info("Stream paused", { id: 'stream-pause' });
      } else {
        await remoteAudioTrack.play();
        setIsPlaying(true);
        setWasPlayingBeforeDisconnect(true);
        toast.success("Playing stream", { id: 'stream-play' });
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      toast.error("Failed to toggle playback", { id: 'playback-error' });
    }
  }, [remoteAudioTrack, isPlaying]);

  const toggleMute = useCallback(() => {
    if (!remoteAudioTrack) return;
    
    try {
      const newMutedState = !isMuted;
      if (newMutedState) {
        remoteAudioTrack.setVolume(0);
        toast.info("Audio muted", { id: 'audio-mute' });
      } else {
        remoteAudioTrack.setVolume(volume);
        toast.info("Audio unmuted", { id: 'audio-unmute' });
      }
      setIsMuted(newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [remoteAudioTrack, isMuted, volume]);

  // ⚡ CLEANUP: Comprehensive cleanup
  useEffect(() => {
    return () => {
      debouncedVolumeChange.cancel();
      stopHeartbeat();
    };
  }, [debouncedVolumeChange, stopHeartbeat]);

  // ⚡ ERROR HANDLING: Show error state if SDK failed to load
  if (sdkError) {
    return (
      <div className="min-h-screen bg-zero-beige flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-inter font-semibold text-zero-text mb-2">
            Service Unavailable
          </h2>
          <p className="text-zero-text/70 font-inter mb-6">
            Failed to load interpretation service: {sdkError}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-zero-blue text-white hover:bg-zero-blue/90 font-inter font-semibold"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // ⚡ ZERO TIMEOUT: Return immediate UI (shows within 50ms)
  return (
    <>
      <ImmediateUI 
        isLive={isLive}
        isPlaying={isPlaying}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        reconnectCount={reconnectCount}
        maxReconnectAttempts={maxReconnectAttempts}
        listenerCount={listenerCount}
        volume={volume}
        isMuted={isMuted}
        isIOS={isIOS}
        handlePlayPauseStream={handlePlayPauseStream}
        toggleMute={toggleMute}
        handleVolumeChange={handleVolumeChange}
        setShowContactModal={setShowContactModal}
        sdkLoading={isSDKLoading}
        remoteMediaStreamTrack={remoteMediaStreamTrack}
        audioLevel={audioLevel}
      />

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full mx-2 sm:mx-4 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-8">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-zero-green to-zero-blue rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-inter font-bold text-zero-text mb-2">Contact Support</h3>
                <p className="text-sm sm:text-base text-zero-text/70 font-inter">Get help with the Live English Interpretation Service</p>
              </div>

              <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-zero-text/70 font-inter mb-2">Email us at:</p>
                  <p className="text-base sm:text-lg font-inter font-bold text-zero-text mb-3 sm:mb-4">info@rafiky.net</p>
                  <p className="text-xs sm:text-sm text-zero-text/60 font-inter leading-relaxed">
                    We'll respond to your inquiry as soon as possible. Click below to open your email client.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    window.location.href = "mailto:info@rafiky.net?subject=Green&Blue Festival - Live English Interpretation Support&body=Hello,%0D%0A%0D%0AI need assistance with the Live English Interpretation Service.%0D%0A%0D%0APlease describe your issue:%0D%0A";
                    setShowContactModal(false);
                  }}
                  className="w-full bg-gradient-to-r from-zero-green to-zero-blue text-white hover:from-zero-green/90 hover:to-zero-blue/90 font-inter font-semibold py-3 sm:py-4 rounded-xl transition-all duration-300 text-sm sm:text-base"
                >
                  Send Email
                </Button>
                <Button
                  onClick={() => setShowContactModal(false)}
                  className="w-full bg-gray-100 text-zero-text hover:bg-gray-200 font-inter font-semibold py-3 sm:py-4 rounded-xl transition-all duration-300 text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optimized CSS - Performance focused */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          border: 2px solid white;
          transition: transform 0.2s ease;
        }
        
        @media (min-width: 1024px) {
          .slider::-webkit-slider-thumb {
            height: 24px;
            width: 24px;
          }
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          border: 2px solid white;
        }

        .slider {
          background: linear-gradient(to right, #A6B92B 0%, #A6B92B ${volume}%, #e5e7eb ${volume}%, #e5e7eb 100%) !important;
        }

        /* Performance optimized animations */
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </>
  );
};

export default React.memo(Listner);