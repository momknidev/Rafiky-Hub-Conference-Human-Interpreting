import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import OnAirIndicator from '@/components/OnAirIndicator';
import AudioLevelMeter from '@/components/AudioLevelMeter';
import ListenerCountBadge from '@/components/ListenerCountBadge';
import { Mic, MicOff, ArrowLeft, RefreshCcw, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { getBroadcastInfoRequest } from '@/http/agoraHttp';

const Broadcast = () => {
  const [isLive, setIsLive] = useState(false);
  const [isMicConnected, setIsMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [listenerCount, setListenerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [client, setClient] = useState(null);


  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ 
      mode: 'live', 
      codec: 'vp8',
      role: 'host' // Set default role as host
    });
    setClient(agoraClient);

    // Set up event listeners for user join/leave
    agoraClient.on('user-joined', () => {
      // setListenerCount(prev => prev + 1);
    });

    agoraClient.on('user-left', () => {
      // setListenerCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      agoraClient.removeAllListeners();
    };
  }, []);

  // Initialize microphone
  const initializeMicrophone = async () => {
    try {
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      setIsMicConnected(true);
      toast.success("Microphone connected successfully!");
      
      // Start monitoring audio levels
      audioTrack.on("audio-volume-indication", (level) => {
        setMicLevel(level);
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsMicConnected(false);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  // Cleanup microphone on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
    };
  }, [localAudioTrack]);

  // Stream duration timer
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setStreamDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStream = async () => {
    try {
      // If microphone is not connected, try to connect it first
      if (!isMicConnected) {
        toast.info("Requesting microphone access...");
        await initializeMicrophone();
        
        // If still not connected after trying to initialize, show error
        if (!isMicConnected) {
          toast.error("Please allow microphone access to start broadcasting");
          return;
        }
      }

      const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
      const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME;
      const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

      // Join the channel as a host
      await client.setClientRole('host'); // Set role as host using string value
      await client.join(APP_ID, CHANNEL_NAME, TOKEN);
      
      // Publish the local audio track
      await client.publish(localAudioTrack);
      
      setIsLive(true);
      setStreamDuration(0);
      // setListenerCount(0); // Reset listener count when starting new stream
      toast.success("Stream started successfully!");
    } catch (error) {
      console.error("Error starting stream:", error);
      toast.error("Failed to start stream");
    }
  };

  const handleStopStream = async () => {
    try {
      // Unpublish the local audio track
      if (localAudioTrack) {
        await client.unpublish(localAudioTrack);
      }
      
      // Leave the channel
      await client.leave();
      
      setIsLive(false);
      setStreamDuration(0);
      // setListenerCount(0);
      toast.info("Stream stopped");
    } catch (error) {
      console.error("Error stopping stream:", error);
      toast.error("Failed to stop stream");
    }
  };

  const handleMicToggle = async () => {
    if (isMicConnected) {
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      setIsMicConnected(false);
      toast.warning("Microphone disconnected");
    } else {
      await initializeMicrophone();
    }
  };

  const handleReconnect = async () => {
    toast.info("Attempting to reconnect microphone...");
    await initializeMicrophone();
  };

  useEffect(() => {
    initializeMicrophone();
  },[])



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
  },[])

  return (
    <div className="min-h-screen bg-zero-beige">
      {/* Header */}
      <header className="bg-zero-navy text-white p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-playfair font-bold">ZERO Broadcaster</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isLive && <OnAirIndicator isLive={isLive} />}
            {isLive && <ListenerCountBadge count={listenerCount} />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 max-w-6xl">
        {/* Status Cards Row */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Stream Status */}
          <Card className="bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-playfair font-semibold text-zero-text">
                Stream Status
              </h3>
              <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-zero-status-good animate-pulse-green' : 'bg-gray-400'}`} />
            </div>
            
            <div className="space-y-3">
              <div className="text-2xl font-playfair font-bold text-zero-text">
                {isLive ? 'LIVE' : 'OFFLINE'}
              </div>
              {isLive && (
                <div className="text-sm text-zero-text/70">
                  Duration: {formatDuration(streamDuration)}
                </div>
              )}
            </div>
          </Card>

          {/* Microphone Status */}
          <Card className="bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-playfair font-semibold text-zero-text">
                Microphone
              </h3>
              {isMicConnected ? 
                <Mic className="h-5 w-5 text-zero-status-good" /> : 
                <MicOff className="h-5 w-5 text-zero-warning" />
              }
            </div>
            
            <div className="space-y-3">
              <div className={`text-sm font-medium ${isMicConnected ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                {isMicConnected ? 'Connected' : 'Not Detected'}
              </div>
              {!isMicConnected && (
                <Button 
                  onClick={handleReconnect}
                  size="sm"
                  className="bg-zero-blue text-white hover:bg-zero-blue/90"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              )}
            </div>
          </Card>

          {/* Audience */}
          <Card className="bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-playfair font-semibold text-zero-text">
                Audience
              </h3>
              <Monitor className="h-5 w-5 text-zero-blue" />
            </div>
            
            <div className="space-y-3">
              <div className="text-2xl font-playfair font-bold text-zero-text">
                {listenerCount}
              </div>
              <div className="text-sm text-zero-text/70">
                {listenerCount === 1 ? 'listener' : 'listeners'}
              </div>
            </div>
          </Card>
        </div>

        {/* Main Control Panel */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Controls */}
          <Card className="bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <h3 className="text-2xl font-playfair font-bold text-zero-text mb-8 text-center">
              Broadcast Controls
            </h3>
            
            <div className="space-y-8">
              {/* Main Action Button */}
              <div className="text-center">
                {!isLive ? (
                  <Button 
                    onClick={handleStartStream}
                    disabled={!isMicConnected}
                    className="w-full bg-zero-green text-zero-text hover:bg-zero-green/90 text-xl px-8 py-8 font-bold transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    <Mic className="mr-3 h-8 w-8" />
                    Start Broadcasting
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopStream}
                    variant="outline"
                    className="w-full border-zero-warning text-zero-warning hover:bg-zero-warning hover:text-white text-xl px-8 py-8 font-bold"
                    size="lg"
                  >
                    <MicOff className="mr-3 h-8 w-8" />
                    Stop Broadcasting
                  </Button>
                )}
              </div>

              {/* Microphone Test */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-inter font-medium text-zero-text">
                    Microphone Test
                  </label>
                  <Button 
                    onClick={handleMicToggle}
                    variant="outline"
                    size="sm"
                    className="border-zero-navy text-zero-navy hover:bg-zero-navy hover:text-white"
                  >
                    {isMicConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
                
                <AudioLevelMeter 
                  level={micLevel}
                  isActive={isMicConnected}
                  className="mb-4"
                  mediaStreamTrack={localAudioTrack?.mediaStreamTrack || undefined}
                />
                
                <p className="text-sm text-zero-text/60">
                  Speak into your microphone to test the audio levels
                </p>
              </div>
            </div>
          </Card>

          {/* Stream Information */}
          <Card className="bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <h3 className="text-2xl font-playfair font-bold text-zero-text mb-8">
              Stream Information
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-zero-text/70">Quality:</span>
                    <div className="font-medium">High (320 kbps)</div>
                  </div>
                  <div>
                    <span className="text-zero-text/70">Language:</span>
                    <div className="font-medium">English → Spanish</div>
                  </div>
                  <div>
                    <span className="text-zero-text/70">Latency:</span>
                    <div className="font-medium text-zero-status-good">Ultra Low</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-zero-text/70">Server:</span>
                    <div className="font-medium">US-East-1</div>
                  </div>
                  <div>
                    <span className="text-zero-text/70">Uptime:</span>
                    <div className="font-medium text-zero-status-good">99.9%</div>
                  </div>
                  <div>
                    <span className="text-zero-text/70">Bandwidth:</span>
                    <div className="font-medium">1.2 Mbps</div>
                  </div>
                </div>
              </div>

              {/* Live Stats */}
              {isLive && (
                <div className="border-t pt-6">
                  <h4 className="font-playfair font-semibold text-zero-text mb-4">
                    Live Statistics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zero-text/70">Peak Listeners:</span>
                      <span className="font-medium">{Math.max(listenerCount, 15)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zero-text/70">Total Listen Time:</span>
                      <span className="font-medium">{Math.round(listenerCount * streamDuration / 60)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zero-text/70">Connection Quality:</span>
                      <span className="font-medium text-zero-status-good">Excellent</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Help & Instructions */}
        <Card className="mt-8 bg-white/60 backdrop-blur-sm p-6 shadow-lg">
          <h3 className="text-lg font-playfair font-semibold text-zero-text mb-4">
            Broadcasting Tips
          </h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm font-inter text-zero-text/70">
            <div>
              <strong className="text-zero-text">Audio Quality:</strong>
              <p>Use a quality microphone and speak clearly at consistent volume</p>
            </div>
            <div>
              <strong className="text-zero-text">Environment:</strong>
              <p>Choose a quiet room with minimal echo and background noise</p>
            </div>
            <div>
              <strong className="text-zero-text">Connection:</strong>
              <p>Ensure stable internet connection for uninterrupted streaming</p>
            </div>
            <div>
              <strong className="text-zero-text">Monitoring:</strong>
              <p>Keep an eye on audio levels and listener feedback</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Broadcast;
