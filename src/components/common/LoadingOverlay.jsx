import PropTypes from "prop-types";

export default function LoadingOverlay({ isLoading, message = "Loading and mixing your songs, please wait for the mix to finish." }) {
  if (!isLoading) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        className="bg-white p-6 sm:p-8 rounded-2xl text-center shadow-2xl transform transition-transform scale-100 animate-fadeIn"
        role="status"
        aria-label="Loading"
      >
        {/* Spinner */}
        <div
          className="animate-spin border-t-4 border-blue-500 border-solid w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-4"
          aria-hidden="true"
        ></div>

        {/* Loading message */}
        <p className="text-gray-700 text-base sm:text-lg">{message}</p>
      </div>
    </div>
  )
}

LoadingOverlay.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  message: PropTypes.string
}