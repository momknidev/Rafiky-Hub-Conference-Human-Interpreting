# Live Audio Streaming Platform - Green & Blue Festival

A professional real-time audio broadcasting and interpretation service built with Next.js and Agora SDK for the Green & Blue Festival's English interpretation needs.

## 🎯 Project Purpose

This application provides a comprehensive live audio streaming solution featuring:
- **Professional Broadcasting Dashboard**: High-quality audio streaming with noise suppression and echo cancellation
- **Live English Interpretation Service**: Real-time interpretation for festival attendees
- **Intelligent Auto-Recovery System**: Automatic reconnection with session persistence
- **Mobile-Optimized Interface**: Responsive design with iOS-specific audio handling
- **Real-time Monitoring**: Connection quality assessment and live analytics

## 🏗️ Project Structure

```
├── app/                          # Next.js App Router
│   ├── broadcast/               # Broadcaster dashboard route
│   │   └── page.jsx            # Main broadcast page
│   ├── listen/                 # Listener interface route  
│   │   └── page.js             # Main listener page
│   ├── layout.js               # Root layout with fonts and Toaster
│   ├── globals.css             # Global styles and brand colors
│   ├── not-found.jsx           # Custom 404 page
│   └── page.js                 # Root page (redirects to listener)
├── components/                  # React Components
│   ├── Broadcast.jsx           # Main broadcaster dashboard
│   ├── Listner.jsx             # Main listener interface with progressive loading
│   ├── OnAirIndicator.jsx      # Live status indicator component
│   ├── AudioLevelMeter.jsx     # Real-time audio visualization
│   ├── ListenerCountBadge.jsx  # Live audience counter display
│   └── ui/                     # Reusable UI components (shadcn/ui based)
├── hooks/                       # Custom React Hooks
│   ├── use-mobile.js           # Mobile device detection hook
│   └── useStreamMetrics.js     # Real-time streaming metrics collection
├── http/                        # API Communication Layer
│   └── agoraHttp.js            # Agora service API calls and utilities
├── lib/                         # Utility Functions and Configurations
└── public/                      # Static Assets
    └── images/                 # Festival branding and layout images
```

## 🔌 Agora SDK Integration

This application uses **Agora RTC SDK NG** (v4.23.3) for professional real-time audio communication.

### Integration Architecture

#### 1. Dynamic SDK Loading
```javascript
// Non-blocking SDK initialization for better performance
const loadAgoraSDK = async () => {
  const AgoraRTC = await import('agora-rtc-sdk-ng');
  return AgoraRTC.default;
};
```

#### 2. Client Configuration
**Broadcaster Setup:**
```javascript
const agoraClient = AgoraRTC.createClient({ 
  mode: 'live',        // Live streaming mode for one-to-many communication
  codec: 'vp8',        // Optimized codec for audio streaming
  role: 'host'         // Broadcaster role with publish permissions
});
```

**Listener Setup:**
```javascript
const agoraClient = AgoraRTC.createClient({
  mode: 'live',        // Live streaming mode
  codec: 'vp8',        // Consistent codec
  role: 'audience'     // Listener role with subscribe-only permissions
});
```

#### 3. Professional Audio Configuration
```javascript
// High-quality microphone setup with professional audio processing
const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
  encoderConfig: {
    sampleRate: 48000,   // Professional audio quality (48kHz)
    stereo: true,        // Stereo audio for better interpretation quality
    bitrate: 128,        // Optimal bitrate for voice
  },
  ANS: true,             // Automatic Noise Suppression for clean audio
  AEC: true,             // Acoustic Echo Cancellation
  AGC: true,             // Automatic Gain Control for consistent levels
});
```

#### 4. Channel Management & Broadcasting
```javascript
// Join channel and start broadcasting
await client.setClientRole('host');
await client.join(APP_ID, CHANNEL_NAME, TOKEN);
await client.publish(localAudioTrack);

// Listen for audience connections
agoraClient.on('user-joined', (user) => {
  console.log('New listener joined:', user.uid);
});
```

#### 5. Listener Audio Subscription
```javascript
// Automatic audio subscription for listeners
agoraClient.on('user-published', async (user, mediaType) => {
  if (mediaType === 'audio') {
    await agoraClient.subscribe(user, mediaType);
    const audioTrack = user.audioTrack;
    audioTrack.setVolume(volume); // Apply user volume settings
    await audioTrack.play();      // Start audio playback
  }
});
```

#### 6. Advanced Connection Monitoring
```javascript
// Real-time network quality monitoring
agoraClient.on('network-quality', (stats) => {
  const quality = stats.uplinkNetworkQuality; // 1=excellent, 5=poor
  updateNetworkStatus(quality);
});

// Connection state management with auto-recovery
agoraClient.on('connection-state-changed', (curState, revState, reason) => {
  if (curState === 'DISCONNECTED' && isLive) {
    triggerAutoReconnection(); // Intelligent reconnection system
  }
});
```

## 📁 Component Documentation

### Core Components

#### `Broadcast.jsx` - Professional Broadcasting Dashboard
**Purpose**: Complete broadcasting control center with advanced monitoring

**Key Features:**
- **Microphone Management**: Professional audio setup with quality controls
- **Stream Control**: Start/stop broadcasting with session tracking  
- **Connection Monitoring**: Real-time network quality and connection status
- **Auto-Recovery System**: Intelligent reconnection with progressive backoff (max 8 attempts)
- **Live Analytics**: Displays listener count, stream duration, and connection metrics
- **Session Persistence**: Maintains broadcast state across network interruptions

**Core Functions:**
```javascript
// Professional microphone initialization with audio processing
const initializeMicrophone = async () => {
  const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: { sampleRate: 48000, stereo: true, bitrate: 128 },
    ANS: true, AEC: true, AGC: true  // Professional audio enhancement
  });
};

// Intelligent reconnection with exponential backoff
const attemptReconnection = useCallback(async () => {
  const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 10000);
  // Maintains session context during reconnection
});
```

#### `Listner.jsx` - Optimized Listener Experience  
**Purpose**: Fast-loading listener interface with progressive enhancement

**Performance Features:**
- **Immediate UI Rendering**: Shows interface within 50ms while loading audio system
- **Progressive Loading**: Background SDK loading with lazy component imports
- **Auto-Resume Playback**: Maintains audio state across connection interruptions
- **Mobile Optimization**: iOS-specific audio handling and touch controls
- **Heartbeat System**: Monitors broadcaster status every 3 seconds

**Performance Architecture:**
```javascript
// Zero-timeout UI rendering - shows instantly
const ImmediateUI = ({ isLive, isPlaying, ... }) => {
  // Renders complete interface while SDK loads in background
};

// Progressive component loading for better performance
const OnAirIndicator = lazy(() => import('@/components/OnAirIndicator'));
const AudioLevelMeter = lazy(() => import('@/components/AudioLevelMeter'));
```

#### `AudioLevelMeter.jsx` - Real-time Audio Visualization
**Purpose**: Visual feedback for audio input/output levels using volume-meter library

**Technical Implementation:**
```javascript
// Real-time audio level detection with Web Audio API
useEffect(() => {
  if(mediaStreamTrack) {
    const ctx = new AudioContext();
    const meter = VolumeMeter(ctx, { tweenIn: 2, tweenOut: 6 }, (volume) => {
      setDisplayLevel(Math.max(0, Math.min(100, volume)));
    });
    const src = ctx.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
    src.connect(meter);
  }
}, [mediaStreamTrack]);
```

#### `OnAirIndicator.jsx` - Live Status Display
**Purpose**: Clear visual indication of broadcast status with accessibility support

**Features:**
- Animated pulsing effect when live
- Responsive sizing (sm/md/lg)
- ARIA labels for accessibility
- Custom green pulse animation

#### `ListenerCountBadge.jsx` - Live Audience Counter
**Purpose**: Real-time display of active listeners with emoji integration

### Custom Hooks

#### `useStreamMetrics.js` - Comprehensive Streaming Analytics
**Purpose**: Real-time collection of streaming performance metrics

**Metrics Collected:**
```javascript
const metrics = {
  bitrate: 0,                    // Audio bitrate in kbps
  latency: 0,                    // Audio delay in milliseconds  
  packetLoss: 0,                 // Packet loss percentage
  connectionQuality: 'Unknown',  // Overall connection assessment
  networkQuality: 'Unknown',     // Network quality (1-5 scale)
  audioQuality: 'Unknown',       // Calculated audio quality score
  uplinkBandwidth: 0,            // Upload bandwidth in kbps
  downlinkBandwidth: 0,          // Download bandwidth in kbps
  audioSendBytes: 0,             // Total bytes sent (broadcaster)
  audioReceiveBytes: 0,          // Total bytes received (listener)
};
```

**Safe API Access:**
```javascript
// Graceful handling of WebRTC API availability
const updateRTCStats = useCallback(async () => {
  if (!isClientReady || !client || typeof window === 'undefined') return;
  
  try {
    if (typeof client.getRTCStats === 'function') {
      const stats = await client.getRTCStats();
      // Process statistics safely
    }
  } catch (error) {
    console.debug('RTC stats unavailable:', error.message);
  }
}, [client, isClientReady]);
```

#### `use-mobile.js` - Responsive Device Detection
**Purpose**: Mobile-first responsive behavior with breakpoint detection

**Implementation:**
```javascript
const MOBILE_BREAKPOINT = 768; // Tailwind 'md' breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(undefined);
  
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  
  return !!isMobile;
}
```

### API Layer

#### `http/agoraHttp.js` - Backend Communication
**Purpose**: Manages communication with broadcast information services

```javascript
/**
 * Fetches real-time broadcast information including listener count
 * @returns {Promise} Response with audience_total, session_id, and status
 */
export const getBroadcastInfoRequest = async () => {
  // API call to get live broadcast statistics
  // Used for listener count updates and session monitoring
};
```

## 🚀 Setup Instructions

### Prerequisites
- **Node.js 18+** or **Bun runtime**
- **Agora.io account** with App ID and REST token
- **Modern browser** with WebRTC support (Chrome, Firefox, Safari, Edge)

### Quick Start

1. **Clone and Install Dependencies:**
```bash
git clone <repository-url>
cd frontend
npm install
# or for faster installation
bun install
```

2. **Environment Configuration:**
Create `.env.local` file in the root directory:
```env
# Agora Configuration - Required for audio streaming
NEXT_PUBLIC_AGORA_APPID="9672c1d378f34772820904b840c913d4"
NEXT_PUBLIC_CHANNEL_NAME="broadcast-channel"
NEXT_PUBLIC_REST_TOKEN="MWRjZjg2Mjk0ZjAyNDMxMzhlOGRmMzdiYTRjZDZmODc6MWM3MWI0NGI5MjNjNDY5Mzk1ZGQ5ZTgxNDQ2MmEyNDg="

# Optional: Channel token for enhanced security (recommended for production)
# NEXT_PUBLIC_AGORA_TOKEN="your_channel_token_here"
```

3. **Start Development Server:**
```bash
npm run dev
# or
bun dev
```

4. **Access the Application:**
- **Broadcaster Dashboard**: `http://localhost:3000/broadcast`
- **Listener Interface**: `http://localhost:3000/listen` or `http://localhost:3000/`

### Environment Variables

| Variable | Purpose | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_AGORA_APPID` | Agora Application ID | ✅ | Unique identifier for your Agora project |
| `NEXT_PUBLIC_CHANNEL_NAME` | Audio Channel Name | ✅ | Channel name for broadcasting (e.g., "broadcast-channel") |
| `NEXT_PUBLIC_REST_TOKEN` | Agora REST API Token | ✅ | Token for backend API calls to fetch broadcast info |
| `NEXT_PUBLIC_AGORA_TOKEN` | Channel Access Token | ❌ | Optional token for enhanced security in production |

**Security Note:** All variables use `NEXT_PUBLIC_` prefix as they're used in client-side code. For production, implement server-side token generation for enhanced security.

## 🧪 Testing & Usage Guide

### Local Development Testing

1. **Start the Development Server:**
```bash
npm run dev
```

2. **Test Broadcasting:**
   - Navigate to `http://localhost:3000/broadcast`
   - Allow microphone permissions when prompted
   - Click "Start Broadcasting" button
   - Monitor connection status and audio levels

3. **Test Listening:**
   - Open new browser tab/window or different device
   - Navigate to `http://localhost:3000/listen`
   - Click "Start Listening" when broadcaster is live
   - Test volume controls and audio quality

4. **Test Auto-Recovery:**
   - Disconnect network during active broadcast
   - Observe automatic reconnection attempts
   - Verify session persistence and audio resume

### Multi-Device Testing

```bash
# Find your local IP address
ipconfig getifaddr en0  # macOS
ip route get 1 | head -1 | cut -d' ' -f7  # Linux

# Access from other devices on same network
http://YOUR_LOCAL_IP:3000/broadcast  # Broadcaster
http://YOUR_LOCAL_IP:3000/listen     # Listeners
```

### API Testing

Test the broadcast information endpoint:
```bash
# Check if backend API is responding
curl -X GET "your-backend-url/api/broadcast/info" \
  -H "Authorization: Bearer MWRjZjg2Mjk0ZjAyNDMxM..."
```

### Example Usage Scenarios

#### Scenario 1: Festival Interpretation Setup
1. **Interpreter**: Access `/broadcast`, start broadcasting
2. **Attendees**: Access `/listen` on mobile devices
3. **Monitor**: Check listener count and connection quality
4. **Network Issues**: System auto-recovers, maintains session

#### Scenario 2: Testing Connection Recovery
1. Start broadcast and connect listeners
2. Disconnect broadcaster's internet for 30 seconds
3. Reconnect - system should auto-recover within 15 seconds
4. Listeners automatically reconnect and resume audio

## 🚀 Deployment Instructions

### Production Build

```bash
# Create optimized production build
npm run build

# Start production server
npm start

# Or with Bun for better performance
bun run build
bun start
```

### Vercel Deployment (Recommended)

1. **Repository Setup:**
   - Push code to GitHub/GitLab/Bitbucket
   - Connect repository to Vercel dashboard

2. **Environment Variables in Vercel:**
   ```
   NEXT_PUBLIC_AGORA_APPID = "your_production_agora_app_id"
   NEXT_PUBLIC_CHANNEL_NAME = "production-channel"
   NEXT_PUBLIC_REST_TOKEN = "your_production_rest_token"
   ```

3. **Deploy:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

4. **Post-Deployment:**
   - Update Agora console with new domain for CORS
   - Test all functionality on production URL
   - Configure custom domain if needed

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm ci
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run Docker container
docker build -t live-streaming-app .
docker run -p 3000:3000 --env-file .env.local live-streaming-app
```

### Environment-Specific Configuration

#### Development
```env
NEXT_PUBLIC_AGORA_APPID="dev_app_id_here"
NEXT_PUBLIC_CHANNEL_NAME="dev-broadcast-channel"
NEXT_PUBLIC_REST_TOKEN="dev_rest_token_here"
```

#### Production
```env
NEXT_PUBLIC_AGORA_APPID="prod_app_id_here"  
NEXT_PUBLIC_CHANNEL_NAME="gb-festival-live"
NEXT_PUBLIC_REST_TOKEN="prod_rest_token_here"
NEXT_PUBLIC_AGORA_TOKEN="secure_channel_token_here"
```

## 🔧 Configuration & Customization

### Performance Optimizations

The `next.config.mjs` includes several production optimizations:

#### Bundle Splitting for Agora SDK
```javascript
webpack: (config, { dev, isServer }) => {
  if (!dev && !isServer) {
    config.optimization.splitChunks.cacheGroups.agora = {
      test: /[\\/]node_modules[\\/]agora-rtc-sdk-ng[\\/]/,
      name: 'agora-sdk',
      chunks: 'all',
      priority: 10, // High priority for separate caching
    };
  }
}
```

#### Image Optimization
```javascript
images: {
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 31536000, // 1 year caching
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
}
```

#### Security Headers
```javascript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
    ],
  }];
}
```

### Brand Customization

#### Custom CSS Variables (`globals.css`)
```css
/* Green & Blue Festival Brand Colors */
:root {
  --color-zero-beige: #F8F0E0;    /* Background */
  --color-zero-green: #C2D538;    /* Primary brand color */
  --color-zero-blue: #00AEEF;     /* Secondary brand color */
  --color-zero-navy: #1E2A38;     /* Dark elements */
  --color-zero-text: #1C1C1C;     /* Text color */
  --color-zero-status-good: #6FBF4C;  /* Success states */
  --color-zero-warning: #D94A39;      /* Warning states */
}
```

#### Typography System
```css
/* Professional typography stack */
--font-playfair: "Playfair Display", serif;  /* Headings */
--font-inter: "Inter", sans-serif;           /* Body text */
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Microphone Not Detected
**Symptoms:** "Microphone Required" message, no audio input
**Solutions:**
```javascript
// Check browser permissions
navigator.permissions.query({ name: 'microphone' }).then(result => {
  if (result.state === 'denied') {
    // Guide user to browser settings
  }
});
```
- Ensure HTTPS in production (required for microphone access)
- Try different browsers (Chrome/Firefox recommended)
- Check system microphone permissions
- Test with different microphone devices

#### 2. Connection Issues
**Symptoms:** "Connection Failed" status, unable to join channel
**Solutions:**
- Verify Agora App ID and tokens in `.env.local`
- Check network connectivity and firewall settings
- Review browser console for detailed error messages
- Test with Agora's network connectivity checker

#### 3. Audio Not Playing (Listeners)
**Symptoms:** Connected but no audio output
**Solutions:**
```javascript
// Check browser autoplay policies
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
if (audioContext.state === 'suspended') {
  await audioContext.resume(); // Requires user interaction
}
```
- Verify device volume levels
- Check browser autoplay policies (requires user interaction)
- Test with different audio output devices
- Clear browser cache and cookies

#### 4. iOS-Specific Audio Issues
**Symptoms:** Audio controls not working on iPhone/iPad
**Solutions:**
- Use device volume buttons (volume slider disabled on iOS)
- Ensure user interaction before starting audio
- Check Safari-specific WebRTC restrictions
- Test with latest iOS Safari version

#### 5. Auto-Reconnection Not Working
**Symptoms:** Manual refresh required after connection loss
**Solutions:**
```javascript
// Check reconnection attempts
console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);

// Reset reconnection counter if needed
setReconnectAttempts(0);
```

### Debug Mode

Enable detailed logging for troubleshooting:
```env
# Add to .env.local for development debugging
NEXT_PUBLIC_DEBUG_MODE="true"
```

This enables:
- Detailed Agora SDK logs
- Connection state debugging
- Performance metrics logging
- Network quality detailed reporting

### Performance Diagnostics

#### Check Loading Performance
```javascript
// Monitor initial load time
console.time('SDK Load Time');
const AgoraRTC = await loadAgoraSDK();
console.timeEnd('SDK Load Time'); // Should be < 2 seconds
```

#### Monitor Connection Quality
```javascript
// Track connection metrics
const metrics = useStreamMetrics(client, localAudioTrack, remoteAudioTrack, isActive);
console.log('Connection Quality:', metrics.connectionQuality);
console.log('Network Quality:', metrics.networkQuality);
console.log('Audio Latency:', metrics.latency + 'ms');
```

## 📊 Monitoring & Analytics

### Real-time Metrics Dashboard

The application provides comprehensive real-time monitoring:

#### Connection Metrics
- **Connection Status**: Connected/Reconnecting/Failed
- **Network Quality**: Excellent/Good/Fair/Poor scale  
- **Reconnection Attempts**: Current attempts vs maximum allowed
- **Session Duration**: Live broadcast time tracking

#### Audio Quality Metrics
- **Bitrate**: Audio quality in kbps (target: 128kbps)
- **Latency**: Audio delay in milliseconds (target: <300ms)
- **Packet Loss**: Network stability percentage
- **Sample Rate**: Audio fidelity (48kHz for professional quality)

#### Audience Analytics
- **Live Listener Count**: Real-time audience size
- **Connection History**: Session persistence tracking
- **Geographic Distribution**: Available through Agora analytics

### Performance Benchmarks

#### Target Performance Metrics
- **Time to First Render**: < 50ms (immediate UI)
- **SDK Loading Time**: < 2 seconds (background loading)
- **Connection Establishment**: < 5 seconds
- **Audio Latency**: < 300ms (professional interpretation standard)
- **Reconnection Time**: < 15 seconds (auto-recovery)

#### Monitoring Tools Integration
```javascript
// Example: Send metrics to analytics service
const trackPerformance = (metric, value) => {
  // Google Analytics, Mixpanel, or custom analytics
  analytics.track('streaming_performance', {
    metric: metric,
    value: value,
    session_id: sessionId,
    timestamp: Date.now()
  });
};
```

## 🤝 Contributing & Development

### Code Standards

#### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Follow React performance optimization patterns
- Use TypeScript for type safety (recommended upgrade)

#### Agora Integration Standards
```javascript
// Always handle errors gracefully
try {
  await client.join(APP_ID, CHANNEL_NAME, TOKEN);
} catch (error) {
  console.error('Join failed:', error);
  toast.error(`Connection failed: ${error.message}`);
}

// Clean up resources properly
useEffect(() => {
  return () => {
    if (localAudioTrack) {
      localAudioTrack.close();
    }
    if (client) {
      client.leave().catch(console.error);
    }
  };
}, []);
```

#### Performance Guidelines
- Use `useCallback` and `useMemo` for expensive operations
- Implement lazy loading for non-critical components
- Optimize bundle size with dynamic imports
- Monitor Core Web Vitals for production deployments

### Development Workflow

1. **Feature Development:**
   - Create feature branch from main
   - Test thoroughly on multiple devices
   - Verify audio quality and connection stability
   - Check mobile responsiveness

2. **Testing Protocol:**
   - Test broadcaster and listener interfaces
   - Verify auto-reconnection scenarios
   - Check iOS-specific functionality
   - Test under various network conditions

3. **Deployment Checklist:**
   - Update environment variables for production
   - Test on production Agora environment
   - Verify HTTPS configuration
   - Monitor initial deployment metrics

## 📞 Support & Contact

### Technical Support
- **Email**: info@rafiky.net
- **Subject Line**: "Green&Blue Festival - Live English Interpretation Support"

### Issue Reporting
When reporting issues, please include:
- Browser version and operating system
- Device type (desktop/mobile/tablet)
- Network connection type
- Detailed steps to reproduce the issue
- Browser console error messages (if any)

### Feature Requests
For new features or improvements:
- Describe the use case and expected behavior
- Include mockups or detailed specifications
- Consider performance and mobile compatibility

---

## 📄 License & Credits

**License**: Proprietary software developed for the Green & Blue Festival. All rights reserved.

**Built with:**
- [Next.js 15.3.3](https://nextjs.org/) - React framework
- [Agora RTC SDK NG 4.23.3](https://docs.agora.io/) - Real-time communication
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Lucide React](https://lucide.dev/) - Beautiful icons

**Developed for**: Green & Blue Festival - "Ripartiamo da Zero - I Numeri per il Futuro del Pianeta"

---

**🎙️ Professional Live English Interpretation Service**  
*Connecting the world through seamless audio streaming technology*