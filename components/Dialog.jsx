import React from 'react'

const Dialog = ({children}) => {
  return (
    <div className='fixed inset-0 z-50 bg-black/50'>
        <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-10'>
            {children}
        </div>
    </div>
  )
}

export default Dialog