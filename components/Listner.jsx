import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import OnAirIndicator from '@/components/OnAirIndicator';
import AudioLevelMeter from '@/components/AudioLevelMeter';
import ListenerCountBadge from '@/components/ListenerCountBadge';
import { Volume, VolumeX, ArrowLeft, Play, Pause, Radio, Signal, Headphones, Users, Wifi, Globe } from 'lucide-react';
import { toast } from 'sonner';
import AgoraRTC from 'agora-rtc-sdk-ng';
import debounce from 'lodash/debounce';
import { getBroadcastInfoRequest } from '@/http/agoraHttp';

const Listner = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [client, setClient] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remoteMediaStreamTrack, setRemoteMediaStreamTrack] = useState(undefined);

  // Create debounced volume handler
  const debouncedVolumeChange = useCallback(
    debounce((newVolume) => {
      if (remoteAudioTrack && !isMuted) {
        remoteAudioTrack.setVolume(newVolume);
      }
    }, 100),
    [remoteAudioTrack, isMuted, isPlaying]
  );

  // Handle volume change with debounce
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    debouncedVolumeChange(newVolume);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedVolumeChange.cancel();
    };
  }, [debouncedVolumeChange]);

  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
      role: 'audience' // Set as audience by default
    });
    setClient(agoraClient);

    // Set up event listeners
    agoraClient.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio') {
        // Subscribe to the remote user
        await agoraClient.subscribe(user, mediaType);

        // Get the remote audio track
        const audioTrack = user.audioTrack;
        const track = audioTrack.getMediaStreamTrack();
        setRemoteMediaStreamTrack(track);

        audioTrack.setVolume(volume)
        setRemoteAudioTrack(audioTrack);

        // Update live status
        setIsLive(true);
        setIsPlaying(false); // Reset playing state when new broadcaster joins
        toast.success("Broadcaster is live");
      }
    });

    agoraClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        // Stop the audio track
        if (remoteAudioTrack) {
          remoteAudioTrack.stop();
          setRemoteAudioTrack(null);
        }

        // Update live status
        setIsLive(false);
        setIsPlaying(false); // Reset playing state when broadcaster leaves
        toast.info("Broadcaster left");
      }
    });

    agoraClient.on('user-joined', () => {
      // setListenerCount(prev => prev + 1);
    });

    agoraClient.on('user-left', () => {
      // setListenerCount(prev => Math.max(0, prev - 1));
    });

    // Automatically join the channel when component mounts
    const joinChannel = async () => {
      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
        const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

        // Join the channel as audience
        await agoraClient.setClientRole('audience');
        await agoraClient.join(APP_ID, CHANNEL_NAME, TOKEN);
        

        setIsConnected(true);
        toast.success("Connected to channel");
      } catch (error) {
        console.error("Error joining channel:", error);
        toast.error("Failed to join channel");
      }
    };

    joinChannel();

    return () => {
      agoraClient.removeAllListeners();
      if (remoteAudioTrack) {
        remoteAudioTrack.stop();
      }
      // Leave the channel when component unmounts
      agoraClient.leave();
    };
  }, []); // Add volume to dependencies to update when it changes

  const handlePlayPauseStream = () => {
    if (remoteAudioTrack) {
      if (isPlaying) {
        remoteAudioTrack.stop();
        toast.info("Stream paused");
      } else {
        remoteAudioTrack.play();
        toast.success("Playing stream");
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (remoteAudioTrack) {
      if (isMuted) {
        remoteAudioTrack.setVolume(volume);
      } else {
        remoteAudioTrack.setVolume(0);
      }
    }
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Audio unmuted" : "Audio muted");
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getBroadcastInfoRequest();
        setListenerCount(res.data?.data?.audience_total || 1);
      } catch (error) {
          console.error(`Getting An Errro While Fetching Listner COund`,error?.response?.data?.message || error.message);
      }
    },5000)

    return () => {
      clearInterval(interval);
    }
  },[]);

  console.log(remoteMediaStreamTrack,"remoteMediaStreamTrack")

  // English flag component with proper UK flag design
  const EnglishFlag = () => (
    <div className="flex items-center gap-3 bg-white/95 backdrop-blur-lg px-4 py-2.5 rounded-xl border border-gray-200/80 shadow-lg">
      <div className="relative w-8 h-6 rounded overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-blue-600"></div>
        {/* White cross */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-white transform origin-center rotate-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white transform -translate-x-1/2"></div>
        {/* Red cross */}
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600"></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-red-600 transform -translate-x-1/2"></div>
        {/* Diagonal red lines */}
        <div className="absolute top-0 left-0 w-4 h-3 bg-blue-600 border-r-2 border-b-2 border-red-600"></div>
        <div className="absolute top-0 right-0 w-4 h-3 bg-blue-600 border-l-2 border-b-2 border-red-600"></div>
        <div className="absolute bottom-0 left-0 w-4 h-3 bg-blue-600 border-r-2 border-t-2 border-red-600"></div>
        <div className="absolute bottom-0 right-0 w-4 h-3 bg-blue-600 border-l-2 border-t-2 border-red-600"></div>
      </div>
      <span className="text-sm font-bold text-gray-800 tracking-wide">English Interpretation</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-zero-beige">
      {/* Modern Header */}
      <header className="bg-zero-navy text-white p-6 sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-gradient-to-br from-zero-green to-zero-blue rounded-2xl flex items-center justify-center shadow-xl">
              <Radio className="h-7 w-7 text-zero-text" />
            </div>
            <div>
              <h1 className="text-3xl font-playfair font-bold tracking-tight">
                Rafiky
              </h1>
              <p className="text-sm text-white/70 font-inter font-medium">Live Audio Interpretation Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <EnglishFlag />
            <OnAirIndicator isLive={isLive} />
            <ListenerCountBadge count={listenerCount} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-8 max-w-7xl">
        {/* Festival Hero Section */}
        <div className="mb-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-zero-green/20 via-zero-blue/10 to-zero-navy/20 backdrop-blur-sm shadow-2xl border border-white/20">
          <div className="absolute inset-0 bg-gradient-to-r from-zero-green/5 to-zero-blue/5"></div>
          <div className="relative p-12">
            {/* Festival Image Placeholder */}
            <div className="mb-8 h-32 bg-gradient-to-r from-zero-green to-zero-blue rounded-2xl flex items-center justify-center shadow-lg">
              <div className="text-center text-white">
                <h3 className="text-2xl font-playfair font-bold">GB FESTIVAL</h3>
                <p className="text-sm opacity-90 font-inter">Green & Blue Festival</p>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-5xl font-playfair font-bold text-zero-text mb-4 tracking-tight">
                Green & Blue Festival 2025
              </h2>
              <p className="text-2xl font-inter text-zero-text/80 mb-8 font-light">
                Live English Interpretation Service
              </p>
              
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Headphones className="h-5 w-5 text-zero-blue" />
                  <span className="font-semibold text-zero-text font-inter">Live Interpretation</span>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Signal className="h-5 w-5 text-zero-green" />
                  <span className="font-semibold text-zero-text font-inter">Premium Audio Quality</span>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Globe className="h-5 w-5 text-zero-navy" />
                  <span className="font-semibold text-zero-text font-inter">Real-time Translation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main Player Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Primary Control Card */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="p-10 text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-zero-green to-zero-blue rounded-full mx-auto mb-8 flex items-center justify-center shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl">
                  {isPlaying ? (
                    <Pause className="h-14 w-14 text-white" />
                  ) : (
                    <Play className="h-14 w-14 text-white ml-2" />
                  )}
                </div>
                
                <h3 className="text-4xl font-playfair font-bold text-zero-text mb-4">
                  {isLive ? 'Live Stream Active' : 'Stream Offline'}
                </h3>
                <p className="text-xl font-inter text-zero-text/70 mb-10 font-light">
                  {isLive ? 'English interpretation in progress' : 'Waiting for broadcaster...'}
                </p>

                {/* Action Buttons */}
                <div className="flex justify-center gap-6">
                  {isLive && (
                    <Button 
                      onClick={handlePlayPauseStream}
                      className={`text-xl px-12 py-8 font-bold transition-all duration-300 hover:scale-105 shadow-xl font-inter rounded-2xl ${
                        isPlaying 
                          ? 'bg-zero-warning text-white hover:bg-zero-warning/90 hover:shadow-2xl' 
                          : 'bg-zero-green text-zero-text hover:bg-zero-green/90 hover:shadow-2xl'
                      }`}
                      size="lg"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="mr-3 h-6 w-6" />
                          Pause Stream
                        </>
                      ) : (
                        <>
                          <Play className="mr-3 h-6 w-6" />
                          Play Stream
                        </>
                      )}
                    </Button>
                  )}

                  {!isLive && (
                    <Button
                      className="text-xl px-12 py-8 bg-zero-navy/80 text-white font-bold transition-all duration-300 hover:bg-zero-navy/70 font-inter rounded-2xl shadow-xl"
                      size="lg"
                      disabled
                    >
                      <Radio className="mr-3 h-6 w-6" />
                      Waiting For Broadcaster...
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Audio Controls */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
              <div className="p-8">
                <h4 className="text-2xl font-playfair font-bold text-zero-text mb-8 flex items-center gap-4">
                  <Volume className="h-7 w-7 text-zero-blue" />
                  Audio Controls
                </h4>
                
                <div className="flex items-center gap-8">
                  <button
                    onClick={toggleMute}
                    className="p-4 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 group shadow-lg hover:shadow-xl"
                    disabled={!isConnected}
                  >
                    {isMuted ? (
                      <VolumeX className="h-7 w-7 text-zero-warning" />
                    ) : (
                      <Volume className="h-7 w-7 text-zero-text group-hover:text-zero-blue transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step={1}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      disabled={isMuted || !isConnected}
                      className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-sm text-zero-text/70 font-inter font-medium">
                      <span>0%</span>
                      <span className="font-bold text-zero-text">{isMuted ? 'Muted' : `${volume}%`}</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-8">
            {/* Stream Quality */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
              <div className="p-8">
                <h4 className="text-xl font-playfair font-bold text-zero-text mb-6 flex items-center gap-3">
                  <Signal className="h-6 w-6 text-zero-green" />
                  Stream Quality
                </h4>
                
                <AudioLevelMeter
                  level={audioLevel}
                  isActive={isConnected && isLive && isPlaying}
                  className="mb-6"
                  mediaStreamTrack={remoteMediaStreamTrack}
                />

                <div className="space-y-4 text-sm font-inter">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Connection</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-zero-status-good animate-pulse' : 'bg-red-500'}`}></div>
                      <span className={`font-bold ${isConnected ? 'text-zero-status-good' : 'text-red-600'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Stream Status</span>
                    <span className={`font-bold ${isLive ? 'text-zero-status-good' : 'text-gray-600'}`}>
                      {isLive ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Audio Status</span>
                    <span className={`font-bold ${isPlaying ? 'text-zero-status-good' : 'text-gray-600'}`}>
                      {isPlaying ? 'Playing' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Language Service */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
              <div className="p-8">
                <h4 className="text-xl font-playfair font-bold text-zero-text mb-6">Language Service</h4>
                
                <div className="space-y-4 text-sm font-inter">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Language</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-4 bg-gradient-to-r from-blue-600 to-red-600 rounded-sm"></div>
                      <span className="font-bold text-zero-text">English</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Interpreter</span>
                    <span className="font-bold text-zero-text">Professional</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-zero-text/70 font-medium">Audio Track</span>
                    <span className={`font-bold ${remoteAudioTrack ? 'text-zero-status-good' : 'text-gray-600'}`}>
                      {remoteAudioTrack ? 'Active' : 'Waiting...'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Session Info */}
            <Card className="bg-gradient-to-br from-zero-green/10 to-zero-blue/10 backdrop-blur-xl border-0 rounded-3xl shadow-xl">
              <div className="p-8">
                <h4 className="text-xl font-playfair font-bold text-zero-text mb-6">Session Information</h4>
                
                <div className="space-y-3 text-sm font-inter">
                  <div className="flex justify-between">
                    <span className="text-zero-text/70 font-medium">Event</span>
                    <span className="font-bold text-zero-text">Green & Blue Festival</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zero-text/70 font-medium">Platform</span>
                    <span className="font-bold text-zero-text">Rafiky</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zero-text/70 font-medium">Server</span>
                    <span className="font-bold text-zero-text">EU-West-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zero-text/70 font-medium">Status</span>
                    <span className={`font-bold ${isConnected ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                      {isConnected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Help Section */}
        <Card className="mt-12 bg-white/70 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
          <div className="p-8">
            <h3 className="text-2xl font-playfair font-bold text-zero-text mb-8">
              Need Assistance?
            </h3>
            <div className="grid md:grid-cols-3 gap-8 text-sm font-inter">
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-zero-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Volume className="h-6 w-6 text-zero-blue" />
                </div>
                <div className="font-bold text-zero-text mb-2">Audio Issues</div>
                <p className="text-zero-text/70 leading-relaxed">Check your device volume and internet connection for optimal audio quality</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-zero-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wifi className="h-6 w-6 text-zero-green" />
                </div>
                <div className="font-bold text-zero-text mb-2">Connection Problems</div>
                <p className="text-zero-text/70 leading-relaxed">Try refreshing the page or rejoining the stream if you experience issues</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-zero-navy/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-zero-navy" />
                </div>
                <div className="font-bold text-zero-text mb-2">Technical Support</div>
                <p className="text-zero-text/70 leading-relaxed">Contact our technical support team for immediate assistance</p>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 28px;
          width: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          border: 3px solid white;
          transition: all 0.3s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 28px;
          width: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .slider {
          background: linear-gradient(to right, #A6B92B 0%, #A6B92B ${volume}%, #e5e7eb ${volume}%, #e5e7eb 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default Listner;