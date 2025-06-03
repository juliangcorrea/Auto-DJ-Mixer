import PropTypes from 'prop-types'
import { useEffect, useRef } from 'react'

export default function ErrorDialog({ message, onClose }) {
  const dialogRef = useRef(null)

  // Focus the dialog container when it mounts for accessibility
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // Keyboard handler for accessibility, supporting Enter and Escape keys
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={dialogRef}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full sm:max-w-sm"
        role="document"
        aria-describedby="error-dialog-message"
      >
        <h3 id="error-dialog-title" className="text-xl font-semibold text-red-600">
          Error
        </h3>
        <p id="error-dialog-message" className="mt-4 text-gray-700 break-words whitespace-pre-wrap">
          {message}
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-red-500 text-white py-2 rounded-lg cursor-pointer hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          autoFocus
          aria-label="Close error dialog"
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  )
}

ErrorDialog.propTypes = {
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}
