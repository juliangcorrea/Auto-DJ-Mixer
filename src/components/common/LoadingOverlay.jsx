import PropTypes from "prop-types";  // Import PropTypes

export default function LoadingOverlay({ isLoading }) {
  if (!isLoading) return null;  // Return null if not loading, so nothing is rendered

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg text-center shadow-lg">
        {/* Spinner */}
        <div className="animate-spin border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full mx-auto mb-4"></div>
        
        {/* Loading message */}
        <p className="text-gray-700 text-lg">
          Loading and mixing your songs, please wait for the mix to finish.
        </p>
      </div>
    </div>
  );
}

// Adding propTypes
LoadingOverlay.propTypes = {
  isLoading: PropTypes.bool.isRequired,  // Ensures isLoading is a required boolean
};

