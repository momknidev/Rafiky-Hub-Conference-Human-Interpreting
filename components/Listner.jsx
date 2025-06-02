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
      role: 'audience'
    });
    setClient(agoraClient);

    // Set up event listeners
    agoraClient.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio') {
        await agoraClient.subscribe(user, mediaType);
        const audioTrack = user.audioTrack;
        const track = audioTrack.getMediaStreamTrack();
        setRemoteMediaStreamTrack(track);
        audioTrack.setVolume(volume);
        setRemoteAudioTrack(audioTrack);
        setIsLive(true);
        setIsPlaying(false);
        toast.success("Broadcaster is live");
      }
    });

    agoraClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        if (remoteAudioTrack) {
          remoteAudioTrack.stop();
          setRemoteAudioTrack(null);
        }
        setIsLive(false);
        setIsPlaying(false);
        toast.info("Broadcaster left");
      }
    });

    agoraClient.on('user-joined', () => {});
    agoraClient.on('user-left', () => {});

    // Automatically join the channel when component mounts
    const joinChannel = async () => {
      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
        const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

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
      agoraClient.leave();
    };
  }, []);

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
          console.error(`Getting An Error While Fetching Listener Count`,error?.response?.data?.message || error.message);
      }
    },5000);

    return () => {
      clearInterval(interval);
    };
  },[]);

  console.log(remoteMediaStreamTrack,"remoteMediaStreamTrack");

  return (
    <div className="min-h-screen bg-zero-beige overflow-x-hidden">
      <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
        
        {/* Festival Poster Image */}
        <div className="mb-8 sm:mb-12 text-center">
          <img 
            src="/images/festival-poster.jpg" 
            alt="Green & Blue Festival - Ripartiamo da Zero - I Numeri per il Futuro del Pianeta"
            className="w-full max-w-3xl mx-auto h-auto object-contain rounded-lg shadow-lg"
            loading="eager"
            width="800"
            height="400"
          />
        </div>
        
        {/* Section Separator for Mobile */}
        <div className="block sm:hidden w-full h-px bg-gradient-to-r from-transparent via-zero-green/60 to-transparent mb-8"></div>
        
        {/* Service Title - No Background, Just Page BG */}
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-inter font-bold text-zero-text mb-6">
            Live English Interpretation Service
          </h1>
          
          {/* Status Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <OnAirIndicator isLive={isLive} />
            <ListenerCountBadge count={listenerCount} />
          </div>
        </div>

        {/* Section Separator for Mobile */}
        <div className="block sm:hidden w-full h-px bg-gradient-to-r from-transparent via-zero-blue/60 to-transparent mb-8"></div>

        {/* Main Player Section - Responsive Layout */}
        <div className="max-w-md lg:max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-2 lg:gap-10 space-y-8 lg:space-y-0">
          
          {/* Left Column - Primary Controls */}
          <div className="space-y-8">
          
          {/* Primary Control Card */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-2xl">
            <div className="p-8 text-center">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-zero-green to-zero-blue rounded-full mx-auto mb-8 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-105">
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
                {isLive ? 'English interpretation in progress' : 'Waiting for broadcaster...'}
              </p>

              {/* Action Buttons */}
              {isLive && (
                <Button 
                  onClick={handlePlayPauseStream}
                  className={`w-full text-lg lg:text-xl px-8 py-6 lg:py-8 font-bold transition-all duration-300 hover:scale-105 shadow-lg font-inter rounded-xl ${
                    isPlaying 
                      ? 'bg-zero-warning text-white hover:bg-zero-warning/90' 
                      : 'bg-zero-green text-zero-text hover:bg-zero-green/90'
                  }`}
                  size="lg"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                      Pause Stream
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                      Play Stream
                    </>
                  )}
                </Button>
              )}

              {!isLive && (
                <Button
                  className="w-full text-lg lg:text-xl px-8 py-6 lg:py-8 bg-zero-navy/80 text-white font-bold font-inter rounded-xl shadow-lg"
                  size="lg"
                  disabled
                >
                  <Radio className="mr-2 h-5 w-5 lg:h-6 lg:w-6" />
                  Waiting For Broadcaster...
                </Button>
              )}
            </div>
          </Card>

          {/* Section Separator for Mobile */}
          <div className="block sm:hidden w-full h-px bg-gradient-to-r from-transparent via-zero-green/50 to-transparent"></div>

          {/* Audio Controls */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-2xl">
            <div className="p-8">
              <h4 className="text-xl lg:text-2xl font-inter font-bold text-zero-text mb-8 flex items-center gap-3">
                <Volume className="h-6 w-6 lg:h-7 lg:w-7 text-zero-blue" />
                Audio Controls
              </h4>
              
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleMute}
                  className="p-4 lg:p-5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 group shadow-lg"
                  disabled={!isConnected}
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6 lg:h-7 lg:w-7 text-zero-warning" />
                  ) : (
                    <Volume className="h-6 w-6 lg:h-7 lg:w-7 text-zero-text group-hover:text-zero-blue transition-colors" />
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
                    className="w-full h-3 lg:h-4 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm lg:text-base text-zero-text/70 font-inter font-medium">
                    <span>0%</span>
                    <span className="font-bold text-zero-text">{isMuted ? 'Muted' : `${volume}%`}</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          </div>

          {/* Right Column - Status & Info */}
          <div className="space-y-8">

          {/* Stream Quality */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-2xl">
            <div className="p-8">
              <h4 className="text-xl lg:text-2xl font-inter font-bold text-zero-text mb-8 flex items-center gap-2">
                <Signal className="h-5 w-5 lg:h-6 lg:w-6 text-zero-green" />
                Stream Status
              </h4>
              
              <AudioLevelMeter
                level={audioLevel}
                isActive={isConnected && isLive && isPlaying}
                className="mb-8"
                mediaStreamTrack={remoteMediaStreamTrack}
              />

              <div className="space-y-4 text-sm lg:text-base font-inter">
                <div className="flex justify-between items-center p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <span className="text-zero-text/70 font-medium">Connection</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-zero-status-good animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`font-bold ${isConnected ? 'text-zero-status-good' : 'text-red-600'}`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <span className="text-zero-text/70 font-medium">Stream Status</span>
                  <span className={`font-bold ${isLive ? 'text-zero-status-good' : 'text-gray-600'}`}>
                    {isLive ? 'Live' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <span className="text-zero-text/70 font-medium">Audio Status</span>
                  <span className={`font-bold ${isPlaying ? 'text-zero-status-good' : 'text-gray-600'}`}>
                    {isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          </div>

          {/* Section Separator for Mobile */}
          <div className="block sm:hidden w-full h-px bg-gradient-to-r from-transparent via-zero-green/60 to-transparent mt-8 lg:mt-0"></div>

          {/* Help Section */}
          <Card className="bg-white/70 backdrop-blur-xl shadow-xl border-0 rounded-2xl lg:col-span-2 mt-8 lg:mt-0">
            <div className="p-8">
              <h3 className="text-lg lg:text-xl font-inter font-bold text-zero-text mb-6">
                Need Help?
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm lg:text-base font-inter text-zero-text/70">
                <div className="p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <div className="font-bold text-zero-text mb-2">Audio Issues</div>
                  <p>Check device volume and internet connection</p>
                </div>
                <div className="p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <div className="font-bold text-zero-text mb-2">Connection Problems</div>
                  <p>Try refreshing the page or rejoining the stream</p>
                </div>
                <div className="p-4 lg:p-5 bg-gray-50 rounded-xl">
                  <div className="font-bold text-zero-text mb-2">Technical Support</div>
                  <p>Contact our support team for assistance</p>
                </div>
              </div>
            </div>
          </Card>
          
          </div>
        </div>
      </main>

      {/* Footer Section with Layout Image */}
      <footer className="w-full mt-16 sm:mt-20">
        {/* Section Separator before Footer */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zero-green/70 to-transparent mb-8"></div>
        
        <div className="text-center px-4 py-8 sm:px-6">
          <img 
            src="/images/layout.png" 
            alt="Festival Layout and Sponsors Information"
            className="w-full max-w-4xl mx-auto h-auto object-contain rounded-lg shadow-lg"
            loading="lazy"
            width="1000"
            height="400"
          />
        </div>
        
        {/* Optional Footer Text */}
        <div className="text-center pb-8 px-4">
          <p className="text-sm text-zero-text/60 font-inter">
            Green & Blue Festival • Live English Interpretation Service
          </p>
        </div>
      </footer>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 2px solid white;
          transition: all 0.3s ease;
        }
        
        @media (min-width: 1024px) {
          .slider::-webkit-slider-thumb {
            height: 28px;
            width: 28px;
          }
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A6B92B, #4A90E2);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .slider {
          background: linear-gradient(to right, #A6B92B 0%, #A6B92B ${volume}%, #e5e7eb ${volume}%, #e5e7eb 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default Listner;