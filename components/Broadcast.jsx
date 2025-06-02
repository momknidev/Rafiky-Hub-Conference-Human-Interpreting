import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import OnAirIndicator from '@/components/OnAirIndicator';
import AudioLevelMeter from '@/components/AudioLevelMeter';
import ListenerCountBadge from '@/components/ListenerCountBadge';
import { Mic, MicOff, ArrowLeft, RefreshCcw, Monitor, Radio, BarChart3, Settings, Wifi, Clock, Users, Signal, Activity, Globe, Headphones } from 'lucide-react';
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
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getBroadcastInfoRequest();
        setListenerCount(res.data?.data?.audience_total || 1);
      } catch (error) {
          console.error(`Getting An Error While Fetching Listener Count`,error?.response?.data?.message || error.message);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    }
  }, []);

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
                Rafiky Broadcaster
              </h1>
              <p className="text-sm text-white/70 font-inter font-medium">Professional Broadcasting Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {isLive && <OnAirIndicator isLive={isLive} />}
            {isLive && <ListenerCountBadge count={listenerCount} />}
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
                Live English Interpretation Broadcasting
              </p>
              
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Mic className="h-5 w-5 text-zero-blue" />
                  <span className="font-semibold text-zero-text font-inter">English Interpretation</span>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Signal className="h-5 w-5 text-zero-green" />
                  <span className="font-semibold text-zero-text font-inter">Professional Audio</span>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <Globe className="h-5 w-5 text-zero-navy" />
                  <span className="font-semibold text-zero-text font-inter">Live Broadcasting</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards Row */}
        <div className="grid gap-8 md:grid-cols-4 mb-12">
          {/* Stream Status */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-red-50 rounded-2xl">
                  <Radio className="h-8 w-8 text-red-600" />
                </div>
                <div className={`w-5 h-5 rounded-full ${isLive ? 'bg-zero-status-good animate-pulse' : 'bg-gray-400'}`} />
              </div>
              
              <div className="space-y-3">
                <div className="text-3xl font-playfair font-bold text-zero-text">
                  {isLive ? 'LIVE' : 'OFFLINE'}
                </div>
                {isLive && (
                  <div className="text-sm text-zero-text/70 font-inter font-medium">
                    Duration: {formatDuration(streamDuration)}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Microphone Status */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl ${isMicConnected ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                  {isMicConnected ? 
                    <Mic className="h-8 w-8 text-emerald-600" /> : 
                    <MicOff className="h-8 w-8 text-orange-600" />
                  }
                </div>
                <Button
                  onClick={handleReconnect}
                  size="sm"
                  variant="outline"
                  className="text-xs font-medium"
                  disabled={isMicConnected}
                >
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  {isMicConnected ? 'Connected' : 'Reconnect'}
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className={`text-lg font-bold font-inter ${isMicConnected ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                  {isMicConnected ? 'Connected' : 'Not Detected'}
                </div>
                <div className="text-xs text-zero-text/60 font-inter">
                  {isMicConnected ? 'Audio input ready' : 'Check permissions'}
                </div>
              </div>
            </div>
          </Card>

          {/* Audience */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <Monitor className="h-6 w-6 text-zero-blue" />
              </div>
              
              <div className="space-y-3">
                <div className="text-3xl font-playfair font-bold text-zero-text">
                  {listenerCount}
                </div>
                <div className="text-sm text-zero-text/70 font-inter font-medium">
                  {listenerCount === 1 ? 'listener' : 'listeners'}
                </div>
              </div>
            </div>
          </Card>

          {/* Connection Quality */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-0 rounded-3xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-emerald-50 rounded-2xl">
                  <Wifi className="h-8 w-8 text-emerald-600" />
                </div>
                <Signal className="h-6 w-6 text-emerald-600" />
              </div>
              
              <div className="space-y-3">
                <div className="text-lg font-bold text-zero-status-good font-inter">
                  Excellent
                </div>
                <div className="text-xs text-zero-text/60 font-inter">
                  1.2 Mbps • 45ms latency
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Main Controls */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="p-10">
              <h3 className="text-4xl font-playfair font-bold text-zero-text mb-10 text-center">
                Broadcast Controls
              </h3>
              
              <div className="space-y-10">
                {/* Main Action Button */}
                <div className="text-center">
                  {!isLive ? (
                    <Button 
                      onClick={handleStartStream}
                      disabled={!isMicConnected}
                      className="w-full bg-zero-green text-zero-text hover:bg-zero-green/90 text-2xl px-12 py-10 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-2xl shadow-xl"
                      size="lg"
                    >
                      <Mic className="mr-4 h-10 w-10" />
                      Start Broadcasting
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopStream}
                      variant="outline"
                      className="w-full border-zero-warning text-zero-warning hover:bg-zero-warning hover:text-white text-2xl px-12 py-10 font-bold font-inter rounded-2xl shadow-xl"
                      size="lg"
                    >
                      <MicOff className="mr-4 h-10 w-10" />
                      Stop Broadcasting
                    </Button>
                  )}
                </div>

                {!isMicConnected && (
                  <div className="text-center bg-orange-50 p-8 rounded-3xl border border-orange-200">
                    <MicOff className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                    <p className="text-orange-800 font-bold text-lg font-inter">Microphone Required</p>
                    <p className="text-sm text-orange-600 mt-2 font-inter">Connect your microphone to start broadcasting</p>
                  </div>
                )}

                {/* Microphone Test */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-2xl font-playfair font-bold text-zero-text">
                      Audio Monitor
                    </h4>
                    <Button 
                      onClick={handleMicToggle}
                      variant="outline"
                      size="sm"
                      className="border-zero-navy text-zero-navy hover:bg-zero-navy hover:text-white font-inter font-medium"
                    >
                      {isMicConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                  
                  <AudioLevelMeter 
                    level={micLevel}
                    isActive={isMicConnected}
                    className="mb-6"
                    mediaStreamTrack={localAudioTrack?.mediaStreamTrack || undefined}
                  />
                  
                  <p className="text-sm text-zero-text/60 font-inter text-center">
                    {isMicConnected ? 
                      'Speak into your microphone to test the audio levels' : 
                      'Connect microphone to monitor audio levels'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Stream Information */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="p-10">
              <h3 className="text-4xl font-playfair font-bold text-zero-text mb-10">
                Stream Information
              </h3>
              
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6 text-sm font-inter">
                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Stream Status</span>
                      <div className={`font-bold text-lg ${isLive ? 'text-zero-status-good' : 'text-gray-600'}`}>
                        {isLive ? 'Broadcasting' : 'Offline'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Language</span>
                      <div className="font-bold text-lg text-zero-text">English</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Mic Status</span>
                      <div className={`font-bold text-lg ${isMicConnected ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                        {isMicConnected ? 'Connected' : 'Disconnected'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Server</span>
                      <div className="font-bold text-lg text-zero-text">EU-West-1</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Listeners</span>
                      <div className="font-bold text-lg text-zero-text">{listenerCount}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <span className="text-zero-text/70 font-medium block mb-1">Duration</span>
                      <div className="font-bold text-lg text-zero-text">{formatDuration(streamDuration)}</div>
                    </div>
                  </div>
                </div>

                {/* Live Stats */}
                {isLive && (
                  <div className="border-t border-gray-200 pt-8">
                    <h4 className="font-playfair font-bold text-zero-text mb-6 text-2xl flex items-center gap-3">
                      <Activity className="h-6 w-6" />
                      Live Statistics
                    </h4>
                    <div className="space-y-4 text-sm font-inter">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                        <span className="text-zero-text/70 font-medium">Peak Listeners</span>
                        <span className="font-bold text-lg text-zero-text">{Math.max(listenerCount, 1)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl">
                        <span className="text-zero-text/70 font-medium">Session Duration</span>
                        <span className="font-bold text-lg text-zero-text">{formatDuration(streamDuration)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-xl">
                        <span className="text-zero-text/70 font-medium">Audio Track</span>
                        <span className={`font-bold text-lg ${localAudioTrack ? 'text-zero-status-good' : 'text-gray-600'}`}>
                          {localAudioTrack ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Broadcasting Tips */}
        <Card className="mt-12 bg-gradient-to-br from-zero-green/5 to-zero-blue/5 backdrop-blur-xl border-0 rounded-3xl shadow-2xl">
          <div className="p-10">
            <h3 className="text-3xl font-playfair font-bold text-zero-text mb-10 text-center">
              Professional Broadcasting Excellence
            </h3>
            <div className="grid md:grid-cols-4 gap-8 text-sm font-inter">
              <div className="text-center p-8 bg-white/60 rounded-3xl">
                <div className="w-16 h-16 bg-zero-blue/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mic className="h-8 w-8 text-zero-blue" />
                </div>
                <div className="font-bold text-zero-text mb-3 text-lg">Audio Excellence</div>
                <p className="text-zero-text/70 leading-relaxed">Use professional microphone and maintain consistent volume levels for optimal quality</p>
              </div>
              <div className="text-center p-8 bg-white/60 rounded-3xl">
                <div className="w-16 h-16 bg-zero-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Settings className="h-8 w-8 text-zero-green" />
                </div>
                <div className="font-bold text-zero-text mb-3 text-lg">Environment</div>
                <p className="text-zero-text/70 leading-relaxed">Choose quiet space with minimal echo and background noise for crystal clear audio</p>
              </div>
              <div className="text-center p-8 bg-white/60 rounded-3xl">
                <div className="w-16 h-16 bg-zero-navy/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wifi className="h-8 w-8 text-zero-navy" />
                </div>
                <div className="font-bold text-zero-text mb-3 text-lg">Stability</div>
                <p className="text-zero-text/70 leading-relaxed">Ensure stable internet connection for uninterrupted streaming and reliability</p>
              </div>
              <div className="text-center p-8 bg-white/60 rounded-3xl">
                <div className="w-16 h-16 bg-zero-warning/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-zero-warning" />
                </div>
                <div className="font-bold text-zero-text mb-3 text-lg">Monitoring</div>
                <p className="text-zero-text/70 leading-relaxed">Keep track of audio levels and audience engagement for professional delivery</p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Broadcast;