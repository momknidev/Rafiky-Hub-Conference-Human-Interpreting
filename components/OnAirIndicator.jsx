import React from "react"

const OnAirIndicator = ({ isLive, size = "md" }) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }

  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  }

  if (!isLive) return null

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <div
        className={`${dotSizes[size]} bg-zero-status-good rounded-full animate-pulse-green`}
        aria-label="Live indicator"
      />
      <span className="font-playfair font-semibold text-zero-status-good">
        On Air
      </span>
    </div>
  )
}

export default OnAirIndicator
