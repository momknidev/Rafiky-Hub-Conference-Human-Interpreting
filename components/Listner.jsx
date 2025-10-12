import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume, VolumeX, ArrowLeft, Play, Pause, Radio, Signal, Headphones, Users, Wifi, Globe, AlertCircle, CheckCircle, Chrome, Monitor, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { getBroadcastInfoRequest } from '@/http/agoraHttp';
import { generateToken } from '@/utils/generateToken';
import { useChannel } from '@/context/ChannelContext';
import { useParams } from 'next/navigation';
import { flagsMapping } from '@/constants/flagsMapping';

// 🚨 CRITICAL: Browser compatibility detection
const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') return { name: 'unknown', version: '0', supported: false };

  const userAgent = navigator.userAgent;
  let name = 'unknown';
  let version = '0';
  let supported = false;

  // Chrome (most compatible)
  if (/Chrome/.test(userAgent) && !/Edge|OPR|Brave/.test(userAgent)) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '0';
    supported = parseInt(version) >= 70;
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : '0';
    supported = parseInt(version) >= 80;
  }
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : '0';
    supported = parseInt(version) >= 13;
  }
  // Edge
  else if (/Edge/.test(userAgent) || /Edg/.test(userAgent)) {
    name = 'Edge';
    const match = userAgent.match(/(?:Edge|Edg)\/(\d+)/);
    version = match ? match[1] : '0';
    supported = parseInt(version) >= 80;
  }
  // Opera
  else if (/OPR/.test(userAgent) || /Opera/.test(userAgent)) {
    name = 'Opera';
    const match = userAgent.match(/(?:OPR|Opera)\/(\d+)/);
    version = match ? match[1] : '0';
    supported = parseInt(version) >= 60;
  }

  // Check WebRTC support
  const hasWebRTC = !!(
    window.RTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection
  );

  // Check MediaDevices API
  const hasMediaDevices = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );

  const finalSupported = supported && hasWebRTC && hasMediaDevices;

  return {
    name,
    version,
    supported: finalSupported,
    hasWebRTC,
    hasMediaDevices,
    userAgent: userAgent.substr(0, 100)
  };
};

// 🚨 CRITICAL: WebRTC Polyfills
const setupWebRTCPolyfills = () => {
  if (!window.RTCPeerConnection) {
    window.RTCPeerConnection =
      window.webkitRTCPeerConnection ||
      window.mozRTCPeerConnection ||
      window.msRTCPeerConnection;
  }

  if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      const getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  if (!window.AudioContext) {
    window.AudioContext = window.webkitAudioContext || window.mozAudioContext;
  }
};

// 🚨 CRITICAL: Multi-CDN Agora loader with fallbacks
const loadAgoraSDKWithFallbacks = async () => {
  if (typeof window === 'undefined') return null;

  setupWebRTCPolyfills();

  const cdnUrls = [
    'https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js',
    'https://cdn.jsdelivr.net/npm/agora-rtc-sdk-ng@4.20.0/AgoraRTC_N.js',
    'https://unpkg.com/agora-rtc-sdk-ng@4.20.0/AgoraRTC_N.js'
  ];

  // Try dynamic import first
  try {
    console.log('🚀 Attempting dynamic import...');
    const AgoraRTC = await import('agora-rtc-sdk-ng');
    console.log('✅ Dynamic import successful');
    return AgoraRTC.default;
  } catch (dynamicError) {
    console.log('❌ Dynamic import failed, trying CDN fallbacks...', dynamicError.message);
  }

  // Fallback to CDN loading
  for (let i = 0; i < cdnUrls.length; i++) {
    try {
      console.log(`🔄 Trying CDN ${i + 1}/${cdnUrls.length}: ${cdnUrls[i]}`);

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = cdnUrls[i];
        script.onload = resolve;
        script.onerror = reject;
        script.timeout = 10000;
        document.head.appendChild(script);

        setTimeout(() => {
          script.onerror?.(new Error('CDN timeout'));
        }, 10000);
      });

      if (window.AgoraRTC) {
        console.log(`✅ CDN ${i + 1} successful`);
        return window.AgoraRTC;
      }
    } catch (cdnError) {
      console.log(`❌ CDN ${i + 1} failed:`, cdnError.message);
      if (i === cdnUrls.length - 1) {
        throw new Error(`All CDN attempts failed. Last error: ${cdnError.message}`);
      }
    }
  }

  throw new Error('Failed to load Agora SDK from all sources');
};

// 🚨 LAZY LOADING COMPONENTS
const OnAirIndicator = lazy(() => import('@/components/OnAirIndicator').catch(() => ({ default: () => <div>Status</div> })));
const AudioLevelMeter = lazy(() => import('@/components/AudioLevelMeter').catch(() => ({ default: () => <div>Audio Meter</div> })));
const ListenerCountBadge = lazy(() => import('@/components/ListenerCountBadge').catch(() => ({ default: () => <div>Listeners</div> })));

const Listner = () => {
  // 🚨 BROWSER COMPATIBILITY STATE
  const params = useParams();
  const { language } = params;
  const [browserInfo, setBrowserInfo] = useState(null);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  // 🚨 CORE STATE
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [volume, setVolume] = useState(750);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // 🚨 ERROR TRACKING
  const [connectionError, setConnectionError] = useState(null);
  const [isSDKLoading, setIsSDKLoading] = useState(true);
  const [sdkError, setSdkError] = useState(null);
  const [AgoraRTC, setAgoraRTC] = useState(null);
  const [client, setClient] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [remoteMediaStreamTrack, setRemoteMediaStreamTrack] = useState(undefined);

  // 🚨 RECONNECTION STATE
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [wasPlayingBeforeDisconnect, setWasPlayingBeforeDisconnect] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastKnownBroadcasterState, setLastKnownBroadcasterState] = useState(null);
  const [broadcasterOnline, setBroadcasterOnline] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(true);
  const { channelName, setLanguage } = useChannel();
  const [subTitle, setSubtitles] = useState([]);
  const isPlayingRef = useRef(false);
  const subTitleContainerRef = useRef(null);


  //auto scroll to bottom
  useEffect(() => {
    if (subTitleContainerRef.current) {
      subTitleContainerRef.current.scrollTop = subTitleContainerRef.current.scrollHeight;
    }
  }, [subTitle]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);


  useEffect(() => {
    setLanguage(language);
  }, [language]);

  // 🚨 DEVICE DETECTION
  const [isIOS] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }
    return false;
  });

  // 🚨 AGGRESSIVE SETTINGS
  const maxReconnectAttempts = 25;
  const heartbeatInterval = 1000;

  const isComponentMountedRef = useRef(true);
  const hasShownConnectedToastRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const startedAlreadyRef = useRef(false);


  // 🚨 CRITICAL: Browser compatibility check on mount
  useEffect(() => {
    const browser = getBrowserInfo();
    setBrowserInfo(browser);

    console.log('🌐 Browser detected:', browser);

    if (!browser.supported) {
      setShowBrowserWarning(true);
      setConnectionError(`Browser compatibility issue: ${browser.name} ${browser.version} may not be fully supported`);
    }
  }, []);

  // 🚨 CRITICAL: Multi-fallback SDK loading
  useEffect(() => {
    let isMounted = true;

    const initializeSDK = async () => {
      try {
        setConnectionError(null);
        console.log('🚨 UNIVERSAL: Loading Agora SDK with fallbacks...');

        const sdk = await loadAgoraSDKWithFallbacks();

        if (isMounted) {
          setAgoraRTC(sdk);
          setIsSDKLoading(false);
          console.log('✅ Agora SDK loaded successfully');

          if (showBrowserWarning) {
            setShowBrowserWarning(false);
            setConnectionError(null);
          }
        }
      } catch (error) {
        console.error('🚨 CRITICAL: All SDK load attempts failed:', error);
        if (isMounted) {
          setSdkError(error.message);
          setConnectionError(`Failed to load streaming system: ${error.message}`);
          setIsSDKLoading(false);
          // toast.error('Failed to load streaming system. Please try Chrome browser.');
        }
      }
    };

    setTimeout(initializeSDK, showBrowserWarning ? 2000 : 100);

    return () => {
      isMounted = false;
    };
  }, [showBrowserWarning]);

  // 🚨 ENHANCED BROADCASTER DETECTION
  const checkBroadcasterStatus = useCallback(async () => {
    try {
      const res = await getBroadcastInfoRequest(channelName);
      const data = res.data?.data;

      if (data) {
        const currentListeners = data.audience_total || 0;
        const hostOnline = data.host_online === true;

        setListenerCount(currentListeners);
        setBroadcasterOnline(hostOnline);

        // Auto-resume logic
        if (hostOnline && isLive && remoteAudioTrack && wasPlayingBeforeDisconnect && !isPlaying) {
          try {
            await remoteAudioTrack.play();
            console.log("auto-resume 4");
            setIsPlaying(true);
            setWasPlayingBeforeDisconnect(false);
            toast.success('🎵 Audio resumed automatically!', { id: 'heartbeat-resume' });
          } catch (error) {
            console.log('Heartbeat auto-resume failed:', error);
          }
        }

        // Force reconnection if needed
        if (hostOnline && isConnected && !isLive && !remoteAudioTrack) {
          setConnectionError('Broadcaster detected but audio not received - reconnecting...');
          if (!isReconnecting && reconnectCount < maxReconnectAttempts) {
            attemptReconnection();
          }
        }

        if (hostOnline && connectionError) {
          setConnectionError(null);
        }
      }
    } catch (error) {
      console.error('Broadcaster status check failed:', error);
      if (!isReconnecting) {
        setConnectionError('Unable to check broadcaster status');
      }
    }
  }, [isConnected, isLive, remoteAudioTrack, isReconnecting, reconnectCount, connectionError, wasPlayingBeforeDisconnect, isPlaying, channelName]);

  // 🚨 AGGRESSIVE RECONNECTION
  const attemptReconnection = useCallback(async () => {
    if (!client || !isComponentMountedRef.current || reconnectCount >= maxReconnectAttempts) return;

    setIsReconnecting(true);
    setReconnectCount(prev => prev + 1);
    setConnectionError(null);

    const delay = Math.min(300 * Math.pow(1.1, reconnectCount), 2000);

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!isComponentMountedRef.current) return;

      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = channelName;
        const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

        if (!APP_ID || !CHANNEL_NAME) {
          throw new Error(`Missing Agora configuration`);
        }

        await client.leave().catch(() => { });
        await client.setClientRole('audience');
        await client.join(APP_ID, CHANNEL_NAME, TOKEN);

        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectCount(0);
        setConnectionError(null);

        toast.success('Reconnected successfully!', { id: 'reconnected' });

      } catch (error) {
        console.error(`Reconnection ${reconnectCount + 1} failed:`, error);
        setConnectionError(`Reconnection failed: ${error.message}`);

        if (reconnectCount < maxReconnectAttempts - 1) {
          attemptReconnection();
        } else {
          setIsReconnecting(false);
          setConnectionError('Connection failed after maximum attempts. Please refresh the page.');
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

  // 🚨 ENHANCED DISCONNECTION HANDLING
  const handleDisconnection = useCallback(() => {
    if (!isComponentMountedRef.current) return;

    if (isPlaying || wasPlayingBeforeDisconnect) {
      setWasPlayingBeforeDisconnect(true);
    }

    setIsConnected(false);
    setIsLive(false);
    setIsPlaying(false);
    setConnectionError('Connection lost - attempting to reconnect...');

    if (remoteAudioTrack) {
      remoteAudioTrack.stop();
      setRemoteAudioTrack(null);
    }
    setRemoteMediaStreamTrack(undefined);

    if (!isReconnecting && reconnectCount < maxReconnectAttempts) {
      toast.info('Connection lost. Reconnecting...', { id: 'reconnecting' });
      attemptReconnection();
    }
  }, [isPlaying, wasPlayingBeforeDisconnect, remoteAudioTrack, isReconnecting, reconnectCount, attemptReconnection, maxReconnectAttempts]);

  // 🚨 UNIVERSAL AGORA CLIENT SETUP
  useEffect(() => {
    if (!AgoraRTC || isSDKLoading) return;

    console.log('🚀 Initializing Universal Agora client...');

    const agoraClient = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
      role: 'audience'
    });
    setClient(agoraClient);

    // Enhanced event handlers
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
          setConnectionError(null);

          // Enhanced auto-resume
          // if (wasPlayingBeforeDisconnect || isPlaying) {
          if (startedAlreadyRef.current) {
            console.log("wasPlayingBeforeDisconnect", wasPlayingBeforeDisconnect);
            setTimeout(async () => {
              try {
                console.log("auto-resume 1");
                await audioTrack.play();
                setIsPlaying(true);
                setWasPlayingBeforeDisconnect(false);
                // toast.success('🎵 Audio resumed automatically!', { id: 'auto-resume' });
              } catch (playError) {
                console.log("playError", playError);
                setTimeout(async () => {
                  try {
                    console.log("auto-resume 2");
                    await audioTrack.play();
                    setIsPlaying(true);
                    setWasPlayingBeforeDisconnect(false);
                    // toast.success('🎵 Audio resumed!', { id: 'delayed-resume' });
                  } catch {
                    toast.info('Click play to resume audio', {
                      id: 'manual-resume',
                      action: {
                        label: 'Play',
                        onClick: () => handlePlayPauseStream()
                      }
                    });
                  }
                }, 1000);
              }
            }, 500);
          }

          if (!isReconnecting) {
            // toast.success("🎙️ Broadcaster is live!", { id: 'broadcaster-live' });
          }
        } catch (error) {
          console.error('Error subscribing to audio:', error);
          setConnectionError(`Failed to connect to audio: ${error.message}`);
          // toast.error("Failed to connect to broadcaster audio", { id: 'connection-error' });
        }
      }

      if (mediaType === "datachannel") {
        await agoraClient.subscribe(user, mediaType);
      }
    });

    agoraClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio' && isComponentMountedRef.current) {
        if (isPlaying) {
          setWasPlayingBeforeDisconnect(true);
        }
        setIsLive(false);
        setIsPlaying(false);
        if (!isReconnecting) {
          // toast.info("🎙️ Broadcaster stopped", { id: 'broadcaster-stopped' });
        }
      }
    });

    agoraClient.on('connection-state-changed', (curState, revState, reason) => {
      console.log('Connection state changed:', curState, 'from:', revState, 'reason:', reason);

      if (curState === 'CONNECTED') {
        setConnectionError(null);
        setIsConnected(true);
      } else if (curState === 'DISCONNECTED' && isConnected && !isReconnecting) {
        handleDisconnection();
      } else if (curState === 'FAILED') {
        setConnectionError(`Connection failed: ${reason}`);
        handleDisconnection();
      } else if (curState === 'RECONNECTING') {
        setConnectionError('Connection unstable, reconnecting...');
      }
    });

    agoraClient.on('exception', (evt) => {
      console.error('Agora exception:', evt);
      setConnectionError(`Stream error: ${evt.code} - ${evt.msg || 'Unknown error'}`);

      if ((evt.code === 'NETWORK_ERROR' || evt.code === 'UNEXPECTED_ERROR') && isConnected && !isReconnecting) {
        handleDisconnection();
      }
    });

    // Enhanced channel joining with timeout
    const joinChannel = async () => {

      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = channelName;
        const { token, uid } = await generateToken("SUBSCRIBER", channelName);

        if (!APP_ID || !CHANNEL_NAME) {
          throw new Error(`Missing required Agora configuration`);
        }

        const joinPromise = (async () => {
          await agoraClient.setClientRole('audience');
          await agoraClient.join(APP_ID, CHANNEL_NAME, token, uid);
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Join timeout after 15 seconds')), 15000)
        );

        await Promise.race([joinPromise, timeoutPromise]);

        if (isComponentMountedRef.current && !hasShownConnectedToastRef.current) {
          setIsConnected(true);
          setConnectionError(null);
          hasShownConnectedToastRef.current = true;

          toast.success("Connected to interpretation service", { id: 'channel-connected' });
          startHeartbeat();
        }
      } catch (error) {
        console.error("Error joining channel:", error);
        if (isComponentMountedRef.current) {
          setConnectionError(`Failed to join: ${error.message}`);
          // toast.error("Failed to connect to interpretation service", { id: 'channel-error' });

          setTimeout(() => {
            if (isComponentMountedRef.current && !isConnected) {
              joinChannel();
            }
          }, 3000);
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
  }, [AgoraRTC, isSDKLoading, isMuted, volume, channelName]);

  // 🚨 HEARTBEAT MANAGEMENT
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    heartbeatIntervalRef.current = setInterval(checkBroadcasterStatus, heartbeatInterval);
  }, [checkBroadcasterStatus, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Session ID generation
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

  // Volume handling
  const debouncedVolumeChange = useCallback(
    debounce((newVolume, audioTrack, muted) => {
      if (audioTrack && !muted) {
        try {
          console.log("newVolume", newVolume, audioTrack.setVolume, muted);
          audioTrack.setVolume(newVolume);
        } catch (error) {
          console.error('Volume control error:', error);
        }
      }
    }, 100),
    []
  );

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (!isMuted) {
      debouncedVolumeChange(newVolume, remoteAudioTrack, false);
    }
  }, [remoteAudioTrack, isMuted, debouncedVolumeChange]);

  const handlePlayPauseStream = useCallback(async () => {

    if (!remoteAudioTrack) {
      setConnectionError('No audio stream available');
      // toast.error('No audio stream available. Please check connection.');
      return;
    }

    try {
      if (isPlaying) {
        startedAlreadyRef.current = false;
        await remoteAudioTrack.stop();
        setIsPlaying(false);
        setWasPlayingBeforeDisconnect(false);
        toast.info("Stream paused", { id: 'stream-pause' });
      } else {
        startedAlreadyRef.current = true;
        await remoteAudioTrack.play();
        console.log("auto-resume 3");
        setIsPlaying(true);
        setWasPlayingBeforeDisconnect(true);
        setConnectionError(null);
        toast.success("Playing stream", { id: 'stream-play' });
      }
    } catch (error) {
      console.error('Playback error:', error);
      setConnectionError(`Playback error: ${error.message}`);
      toast.error("Failed to toggle playback", { id: 'playback-error' });
    }
  }, [remoteAudioTrack, isPlaying, startedAlreadyRef]);

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
      console.error('Mute error:', error);
      setConnectionError(`Mute error: ${error.message}`);
    }
  }, [remoteAudioTrack, isMuted, volume]);

  // Page visibility handling
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
        } else {
          checkBroadcasterStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLive, remoteAudioTrack, wasPlayingBeforeDisconnect, isPlaying, isConnected, startHeartbeat, checkBroadcasterStatus, handlePlayPauseStream]);

  // Audio context handling
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
        console.error('Audio context error:', error);
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

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedVolumeChange.cancel();
      stopHeartbeat();
    };
  }, [debouncedVolumeChange, stopHeartbeat]);

  // Status determination
  const getStreamStatus = () => {
    if (isSDKLoading) return { status: 'loading', message: 'Loading audio system...' };
    // if (showBrowserWarning) return { status: 'browser-warning', message: 'Browser compatibility check...' };
    // if (connectionError) return { status: 'error', message: connectionError };
    if (isReconnecting) return { status: 'reconnecting', message: `Reconnecting... (${reconnectCount}/${maxReconnectAttempts})` };
    if (!isConnected) return { status: 'disconnected', message: 'Connecting to service...' };
    if (broadcasterOnline && !isLive) return { status: 'waiting', message: 'Broadcaster online, establishing audio...' };
    if (isLive) return { status: 'live', message: 'Live stream active' };
    return { status: 'offline', message: 'Waiting for broadcaster...' };
  };

  const streamStatus = getStreamStatus();

  // Browser incompatibility screen
  // if (showBrowserWarning && browserInfo && !browserInfo.supported) {
  //   return (
  //     <div className="min-h-screen bg-zero-beige flex items-center justify-center">
  //       <div className="text-center max-w-lg mx-auto p-8">
  //         <div className="w-20 h-20 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
  //           <AlertCircle className="w-10 h-10 text-orange-600" />
  //         </div>

  //         <h2 className="text-2xl font-inter font-bold text-zero-text mb-4">
  //           Browser Compatibility Issue
  //         </h2>

  //         <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
  //           <h3 className="font-semibold mb-3">Detected Browser:</h3>
  //           <div className="space-y-2 text-sm">
  //             <div><strong>Browser:</strong> {browserInfo.name} {browserInfo.version}</div>
  //             <div><strong>WebRTC Support:</strong> {browserInfo.hasWebRTC ? '✅ Yes' : '❌ No'}</div>
  //             <div><strong>Media API:</strong> {browserInfo.hasMediaDevices ? '✅ Yes' : '❌ No'}</div>
  //           </div>
  //         </div>

  //         <div className="bg-blue-50 rounded-xl p-6 mb-6">
  //           <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
  //             <Chrome className="w-5 h-5" />
  //             Recommended Solution
  //           </h3>
  //           <p className="text-blue-700 text-sm">
  //             For the best experience, please use <strong>Google Chrome</strong> browser, 
  //             which has been tested and confirmed to work properly with our interpretation service.
  //           </p>
  //         </div>

  //         <div className="space-y-3">
  //           <Button
  //             onClick={() => {
  //               setShowBrowserWarning(false);
  //               setConnectionError(null);
  //             }}
  //             className="w-full bg-orange-600 text-white hover:bg-orange-700 font-inter font-semibold py-3 rounded-xl"
  //           >
  //             Continue Anyway
  //           </Button>

  //           <Button
  //             onClick={() => window.location.reload()}
  //             className="w-full bg-blue-600 text-white hover:bg-blue-700 font-inter font-semibold py-3 rounded-xl"
  //           >
  //             Refresh Page
  //           </Button>

  //           <p className="text-xs text-gray-600">
  //             If problems persist, please contact support: info@rafiky.net
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // SDK loading failure
  // if (sdkError) {
  //   return (
  //     <div className="min-h-screen bg-zero-beige flex items-center justify-center">
  //       <div className="text-center max-w-md mx-auto p-8">
  //         <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
  //         <h2 className="text-xl font-inter font-semibold text-zero-text mb-2">
  //           Service Unavailable
  //         </h2>
  //         <p className="text-zero-text/70 font-inter mb-6">
  //           Failed to load interpretation service: {sdkError}
  //         </p>

  //         {browserInfo && (
  //           <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left text-sm">
  //             <div><strong>Browser:</strong> {browserInfo.name} {browserInfo.version}</div>
  //             <div><strong>Compatible:</strong> {browserInfo.supported ? 'Yes' : 'No'}</div>
  //           </div>
  //         )}

  //         <div className="space-y-3">
  //           <Button
  //             onClick={() => window.location.reload()}
  //             className="w-full bg-zero-blue text-white hover:bg-zero-blue/90 font-inter font-semibold"
  //           >
  //             Refresh Page
  //           </Button>

  //           <div className="bg-blue-50 rounded-lg p-4">
  //             <div className="flex items-center gap-2 mb-2">
  //               <Chrome className="w-4 h-4 text-blue-600" />
  //               <span className="text-sm font-semibold text-blue-800">Recommended</span>
  //             </div>
  //             <p className="text-xs text-blue-600">
  //               Try using Google Chrome browser for the best compatibility
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="min-h-screen bg-zero-beige">
        {/* Festival Header */}
        <div className="w-full overflow-hidden">
          <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
            <div className='w-full flex items-center justify-center flex-row gap-4 bg-brand'>
              {
                Array.from({ length: 3 }).map((_, index) => (
                  <img key={index} src={`/logo/logo-${index + 1}.png`} alt="Livello Logo" className='w-[8rem] md:w-[10rem] object-contain aspect-square' />
                ))
              }
            </div>
          </div>
        </div>

        <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
          {/* Service Title */}
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-inter font-bold text-zero-text mb-6 flex items-center justify-center">
              Live {language?.slice(0, 1).toUpperCase()}{language?.slice(1).toLowerCase()} Interpretation Service
            </h1>


            {/* Status Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              {isSDKLoading ? (
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

                  {/* Connection Status */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${streamStatus.status === 'live' ? 'text-green-600 bg-green-50' :
                    streamStatus.status === 'reconnecting' ? 'text-blue-600 bg-blue-50' :
                      streamStatus.status === 'loading' ? 'text-blue-600 bg-blue-50' :
                        'text-orange-600 bg-orange-50'
                    }`}>
                    {streamStatus.status === 'reconnecting' || streamStatus.status === 'loading' ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : streamStatus.status === 'live' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {streamStatus.status === 'live' ? 'Connected' :
                      streamStatus.status === 'reconnecting' ? `Reconnecting (${reconnectCount}/${maxReconnectAttempts})` :
                        streamStatus.status === 'loading' ? 'Loading' :
                          streamStatus.status === 'waiting' ? 'Connecting Audio' :
                            'Offline'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Alert Banners */}
          {streamStatus.status === 'reconnecting' && (
            <div className="max-w-md lg:max-w-4xl mx-auto mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="font-semibold text-blue-800">Reconnecting to interpretation service...</p>
                  <p className="text-sm text-blue-600">
                    Attempt {reconnectCount} of {maxReconnectAttempts} - Audio will resume automatically
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Player Section */}
          <div className="max-w-md lg:max-w-4xl mx-auto">
            <div className="lg:grid lg:grid-cols-1 lg:gap-10 space-y-8 lg:space-y-0">

              {/* Left Column - Primary Controls */}
              <div className="space-y-8">

                {/* Primary Control Card */}
                <Card className="bg-white/90 border-0 rounded-2xl">
                  <div className="p-8 text-center">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-brand to-zero-blue rounded-full mx-auto mb-8 flex items-center justify-center transform transition-all duration-300 hover:scale-105">
                      {isPlaying ? (
                        <Pause className="h-10 w-10 lg:h-14 lg:w-14 text-white" />
                      ) : (
                        <Play className="h-10 w-10 lg:h-14 lg:w-14 text-white ml-1" />
                      )}
                    </div>

                    <h3 className="text-2xl lg:text-3xl font-inter font-bold text-zero-text mb-4">
                      {streamStatus.status === 'live' ? 'Live Stream Active' :
                        streamStatus.status === 'loading' ? 'Loading Service' :
                          streamStatus.status === 'reconnecting' ? 'Reconnecting' :
                            streamStatus.status === 'waiting' ? 'Connecting Audio' :
                              'Stream Offline'}
                    </h3>

                    <p className="text-base lg:text-lg font-inter text-zero-text/70 mb-8">
                      {streamStatus.message}
                    </p>

                    {/* Action Buttons */}
                    {streamStatus.status === 'live' && (
                      <>
                        <Button
                          onClick={handlePlayPauseStream}
                          className={`w-full text-lg lg:text-xl px-8 py-6 lg:py-8 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-xl ${isPlaying
                            ? 'bg-zero-warning text-white hover:bg-zero-warning/90'
                            : 'bg-brand text-white hover:bg-brand/90'
                            }`}
                          size="lg"
                          disabled={streamStatus.status === 'reconnecting'}
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

                        {
                          subtitleOpen == false && (
                            <Button
                              onClick={() => setSubtitleOpen(true)}
                              className="text-blue-500 hover:text-blue-600 ml-auto"
                              size="lg"
                            >
                              Open Subtitles
                            </Button>
                          )
                        }
                      </>
                    )
                    }


                    {streamStatus.status !== 'live' && (
                      <Button
                        className="w-full text-lg lg:text-xl px-8 py-6 lg:py-8 bg-zero-navy/80 text-white font-bold font-inter rounded-xl"
                        size="lg"
                        disabled
                      >
                        <Radio className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                        Waiting For Broadcaster...
                      </Button>
                    )}


                  </div>
                </Card>
              </div>

           
            </div>
          </div>
        </main>
      </div>

      {
        subTitle.length > 0 && (
          <div className='h-[15rem] w-full'></div>
        )
      }

      {/* Optimized CSS */}
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