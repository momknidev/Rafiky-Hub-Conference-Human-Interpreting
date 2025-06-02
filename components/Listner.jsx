import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import OnAirIndicator from '@/components/OnAirIndicator';
import AudioLevelMeter from '@/components/AudioLevelMeter';
import ListenerCountBadge from '@/components/ListenerCountBadge';
import { Volume, VolumeX, ArrowLeft } from 'lucide-react';
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
  const [remoteMediaStreamTrack,setRemoteMediaStreamTrack] = useState(undefined);

  // Create debounced volume handler
  const debouncedVolumeChange = useCallback(
    debounce((newVolume) => {
      if (remoteAudioTrack && !isMuted) {
        remoteAudioTrack.setVolume(newVolume);
      }
    }, 100),
    [remoteAudioTrack, isMuted,isPlaying]
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

  return (
    <div className="min-h-screen bg-zero-beige">
      {/* Header */}
      <header className="bg-zero-navy text-white p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-playfair font-bold">ZERO Listener</h1>
          </div>

          <div className="flex items-center gap-4">
            <OnAirIndicator isLive={isLive} />
            <ListenerCountBadge count={listenerCount} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 max-w-4xl">
        <div className="grid gap-8 md:grid-cols-2 ">
          {/* Hero Card */}
          <Card className="col-span-full bg-white/80 backdrop-blur-sm p-8 text-center shadow-lg">
            <div className="mb-6">
              <h2 className="text-4xl font-playfair font-bold text-zero-text mb-4">
                Live Audio Stream
              </h2>
              <p className="text-lg font-inter text-zero-text/70">
                Professional interpretation service
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              {isLive && (
                <Button 
                  onClick={handlePlayPauseStream}
                  className={`w-full md:w-auto text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105 ${
                    isPlaying 
                      ? 'bg-zero-warning text-white hover:bg-zero-warning/90' 
                      : 'bg-zero-green text-zero-text hover:bg-zero-green/90'
                  }`}
                  size="lg"
                >
                  {isPlaying ? 'Pause Stream' : 'Play Stream'}
                </Button>
              )}

              {!isLive && (
                <Button
                  className="w-full md:w-auto bg-zero-navy/80 text-white text-lg px-8 py-6 font-semibold transition-all duration-300 hover:bg-zero-navy/80"
                  size="lg"
                >
                  Waiting For Broadcaster...
                </Button>
              )}
            </div>
          </Card>

          {/* Audio Controls */}
          <Card className="bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <h3 className="text-xl font-playfair font-semibold text-zero-text mb-6">
              Audio Controls
            </h3>

            <div className="space-y-6">
              {/* Volume Control */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-inter font-medium text-zero-text">
                    Volume
                  </label>
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    disabled={!isConnected}
                  >
                    {isMuted ?
                      <VolumeX className="h-5 w-5 text-zero-warning" /> :
                      <Volume className="h-5 w-5 text-zero-text" />
                    }
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step={1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  disabled={isMuted || !isConnected}
                  className="w-full"
                />
                <div className="text-sm text-zero-text/60 mt-1">
                  {isMuted ? 'Muted' : `${volume}%`}
                </div>
              </div>
            </div>
          </Card>

          {/* Audio Level Display */}
          <Card className="bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <h3 className="text-xl font-playfair font-semibold text-zero-text mb-6">
              Stream Quality
            </h3>

            <AudioLevelMeter
              level={audioLevel}
              isActive={isConnected && isLive}
              className="mb-4"
              mediaStreamTrack={remoteMediaStreamTrack}
            />

            <div className="space-y-3 text-sm font-inter">
              <div className="flex justify-between">
                <span className="text-zero-text/70">Bitrate:</span>
                <span className="font-medium">320 kbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zero-text/70">Latency:</span>
                <span className="font-medium text-zero-status-good">Low (45ms)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zero-text/70">Connection:</span>
                <span className="font-medium text-zero-status-good">Stable</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-white/60 backdrop-blur-sm p-6 shadow-lg">
          <h3 className="text-lg font-playfair font-semibold text-zero-text mb-4">
            Need Help?
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm font-inter text-zero-text/70">
            <div>
              <strong>Audio Issues:</strong>
              <p>Check your device volume and internet connection</p>
            </div>
            <div>
              <strong>Connection Problems:</strong>
              <p>Try refreshing the page or rejoining the stream</p>
            </div>
            <div>
              <strong>Support:</strong>
              <p>Contact our technical support team for assistance</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Listner;
