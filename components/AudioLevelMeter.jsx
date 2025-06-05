import React, { useEffect, useState } from "react"
import VolumeMeter from "volume-meter"

const AudioLevelMeter = ({ level = 0, isActive = false, className = "",mediaStreamTrack }) => {
  const [displayLevel, setDisplayLevel] = useState(0)



  useEffect(() => {
    console.log(mediaStreamTrack,"mediaStreamTrack")
    let meter = undefined;
    if(mediaStreamTrack){
      var ctx = new AudioContext();
      meter = VolumeMeter(ctx, { tweenIn: 2, tweenOut: 6 }, function (volume) {
        const newLevel = Math.max(0, Math.min(100, volume))
        setDisplayLevel(newLevel);
      });
      const stream = new MediaStream([mediaStreamTrack]);
      var src = ctx.createMediaStreamSource(stream)
      src.connect(meter)
      stream.onended = meter.stop.bind(meter)
    }

    return () => {
      if(meter){
        meter.stop.bind(meter);
      }
    }
  },[mediaStreamTrack])
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-inter font-medium text-zero-text">
          Audio Level
        </span>
        <span className="text-xs font-inter text-zero-text/60">
          {Math.round(displayLevel)}%
        </span>
      </div>

      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full gradient-audio-level transition-all duration-100 ease-out"
          style={{
            width: `${displayLevel}%`,
            opacity: isActive ? 1 : 0.3
          }}
        />
      </div>

      {/* Level indicator marks */}
      <div className="flex justify-between mt-1 text-xs text-zero-text/40">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  )
}

export default AudioLevelMeter
