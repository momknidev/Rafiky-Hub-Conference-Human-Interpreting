'use client';
import { useState, useEffect, useCallback } from 'react';

export const useStreamMetrics = (client, localAudioTrack, remoteAudioTrack, isActive) => {
  const [metrics, setMetrics] = useState({
    bitrate: 0,
    latency: 0,
    packetLoss: 0,
    connectionQuality: 'Unknown',
    networkQuality: 'Unknown',
    audioQuality: 'Unknown',
    networkType: 'Unknown',
    sampleRate: 48000,
    channels: 1,
    audioSendBytes: 0,
    audioReceiveBytes: 0,
    audioSendPackets: 0,
    audioReceivePackets: 0,
    uplinkBandwidth: 0,
    downlinkBandwidth: 0,
  });

  const [isClientReady, setIsClientReady] = useState(false);

  // Check if we're on client side and client is ready
  useEffect(() => {
    if (typeof window !== 'undefined' && client) {
      // Wait a bit for client to be fully initialized
      const timer = setTimeout(() => {
        setIsClientReady(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [client]);

  // Get network quality safely
  const updateNetworkQuality = useCallback(async () => {
    if (!isClientReady || !client || typeof window === 'undefined') return;

    try {
      // Check if client has the method and is in a valid state
      if (typeof client.getRemoteNetworkQuality === 'function') {
        const stats = await client.getRemoteNetworkQuality();
        
        const getQualityText = (quality) => {
          switch (quality) {
            case 1: return 'Excellent';
            case 2: return 'Good';
            case 3: return 'Fair';
            case 4: return 'Poor';
            case 5: return 'Very Poor';
            case 0: return 'Unknown';
            default: return 'Unknown';
          }
        };

        const uplinkQuality = stats?.uplinkNetworkQuality || 0;
        const downlinkQuality = stats?.downlinkNetworkQuality || 0;
        const overallQuality = Math.min(uplinkQuality, downlinkQuality);

        setMetrics(prev => ({
          ...prev,
          networkQuality: getQualityText(overallQuality),
          connectionQuality: getQualityText(overallQuality)
        }));
      }
    } catch (error) {
      // Silently handle errors - network quality isn't critical
      console.debug('Network quality unavailable:', error.message);
    }
  }, [client, isClientReady]);

  // Get RTC stats safely
  const updateRTCStats = useCallback(async () => {
    if (!isClientReady || !client || typeof window === 'undefined') return;

    try {
      if (typeof client.getRTCStats === 'function') {
        const stats = await client.getRTCStats();
        
        // Update metrics based on available stats
        setMetrics(prev => {
          const newMetrics = { ...prev };

          // Broadcaster stats
          if (localAudioTrack && stats?.LocalAudioTrackStats) {
            const audioStats = stats.LocalAudioTrackStats;
            newMetrics.bitrate = Math.round((audioStats.sendBitrate || 0) / 1000);
            newMetrics.audioSendBytes = audioStats.sendBytes || 0;
            newMetrics.audioSendPackets = audioStats.sendPackets || 0;
          }

          // Listener stats
          if (remoteAudioTrack && stats?.RemoteAudioTrackStats) {
            const audioStats = stats.RemoteAudioTrackStats;
            newMetrics.bitrate = Math.round((audioStats.receiveBitrate || 0) / 1000);
            newMetrics.audioReceiveBytes = audioStats.receiveBytes || 0;
            newMetrics.audioReceivePackets = audioStats.receivePackets || 0;
            newMetrics.latency = audioStats.delay || 0;
          }

          // Connection stats
          if (stats?.Connection) {
            const connStats = stats.Connection;
            newMetrics.uplinkBandwidth = Math.round((connStats.uplinkBandwidth || 0) / 1000);
            newMetrics.downlinkBandwidth = Math.round((connStats.downlinkBandwidth || 0) / 1000);
            newMetrics.packetLoss = connStats.packetLoss || 0;
          }

          return newMetrics;
        });
      }
    } catch (error) {
      console.debug('RTC stats unavailable:', error.message);
    }
  }, [client, localAudioTrack, remoteAudioTrack, isClientReady]);

  // Get audio properties safely
  const updateAudioProperties = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const track = localAudioTrack || remoteAudioTrack;
      if (track && typeof track.getMediaStreamTrack === 'function') {
        const mediaStreamTrack = track.getMediaStreamTrack();
        if (mediaStreamTrack && typeof mediaStreamTrack.getSettings === 'function') {
          const settings = mediaStreamTrack.getSettings();
          setMetrics(prev => ({
            ...prev,
            sampleRate: settings.sampleRate || 48000,
            channels: settings.channelCount || 1
          }));
        }
      }
    } catch (error) {
      console.debug('Audio properties unavailable:', error.message);
    }
  }, [localAudioTrack, remoteAudioTrack]);

  // Get network type safely
  const updateNetworkType = useCallback(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    try {
      if (navigator.connection) {
        const connection = navigator.connection;
        setMetrics(prev => ({
          ...prev,
          networkType: connection.effectiveType || connection.type || 'WiFi'
        }));
      } else {
        setMetrics(prev => ({
          ...prev,
          networkType: 'WiFi' // Default assumption
        }));
      }
    } catch (error) {
      console.debug('Network type unavailable:', error.message);
    }
  }, []);

  // Calculate audio quality based on available metrics
  const calculateAudioQuality = useCallback(() => {
    const { latency, packetLoss, bitrate } = metrics;
    
    if (latency === 0 && packetLoss === 0 && bitrate === 0) {
      return 'Unknown';
    }

    let score = 100;
    
    if (latency > 300) score -= 40;
    else if (latency > 150) score -= 20;
    else if (latency > 100) score -= 10;
    
    if (packetLoss > 5) score -= 30;
    else if (packetLoss > 2) score -= 15;
    else if (packetLoss > 1) score -= 5;
    
    if (bitrate > 0 && bitrate < 32) score -= 20;
    else if (bitrate > 0 && bitrate < 64) score -= 10;
    
    if (score < 50) return 'Poor';
    if (score < 70) return 'Fair';
    if (score < 85) return 'Good';
    return 'Excellent';
  }, [metrics.latency, metrics.packetLoss, metrics.bitrate]);

  // Update audio quality when metrics change
  useEffect(() => {
    const quality = calculateAudioQuality();
    setMetrics(prev => ({
      ...prev,
      audioQuality: quality
    }));
  }, [calculateAudioQuality]);

  // Main update loop - only run when active and client is ready
  useEffect(() => {
    if (!isClientReady || !isActive || typeof window === 'undefined') return;

    // Initial update
    updateNetworkType();
    updateAudioProperties();

    // Regular updates
    const interval = setInterval(() => {
      updateRTCStats();
      updateNetworkQuality();
      updateAudioProperties();
    }, 3000); // Update every 3 seconds to be less aggressive

    return () => clearInterval(interval);
  }, [isClientReady, isActive, updateRTCStats, updateNetworkQuality, updateAudioProperties, updateNetworkType]);

  // Helper functions
  const formatBytes = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getQualityColor = useCallback((quality) => {
    switch (quality?.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'very poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, []);

  return {
    metrics,
    formatBytes,
    formatDuration,
    getQualityColor,
    isReady: isClientReady
  };
};