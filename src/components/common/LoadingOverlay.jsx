import PropTypes from "prop-types";

export default function LoadingOverlay({
  isLoading,
  message = "Loading and mixing your songs, please wait — this may take a couple minutes.",
}) {
  if (!isLoading) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", willChange: "transform" }}
    >
      <div
        className="bg-gray-900 text-white p-6 sm:p-8 rounded-2xl text-center shadow-2xl flex flex-col items-center"
        role="status"
        aria-label="Loading"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="120"
          height="120"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeDasharray="10 10"
            strokeLinecap="round"
          />
          <rect
            x="14"
            y="20"
            width="8"
            height="24"
            fill="#3b82f6"
            rx="2"
          />
          <rect
            x="26"
            y="14"
            width="8"
            height="36"
            fill="#2563eb"
            rx="2"
          />
          <rect
            x="38"
            y="24"
            width="8"
            height="16"
            fill="#60a5fa"
            rx="2"
          />
        </svg>
        <p className="mt-4 text-base sm:text-lg max-w-xs">{message}</p>
      </div>
    </div>
  );
}

LoadingOverlay.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  message: PropTypes.string,
};