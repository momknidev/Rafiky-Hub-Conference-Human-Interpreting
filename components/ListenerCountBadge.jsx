import React from "react"

const ListenerCountBadge = ({ count, className = "" }) => {
  return (
    <div
      className={`bg-zero-blue text-white px-3 py-1 rounded-full font-inter font-medium text-sm ${className}`}
    >
      <span className="mr-1">👥</span>
      {count} {count === 1 ? "listener" : "listeners"}
    </div>
  )
}

export default ListenerCountBadge
