import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import StyledButton from "../components/common/StyledButton";

export default function Download() {
  const location = useLocation();
  const passedUrl = location.state?.mixUrl || null;

  const [mixUrl, setMixUrl] = useState(null);

  useEffect(() => {
    if (passedUrl) {
      setMixUrl(passedUrl);
    }
  }, [passedUrl]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white p-8 rounded-xl shadow-lg text-center">
        <h2 className="text-3xl font-semibold mb-6 text-gray-900">
          Your Mix is Ready!
        </h2>

        {mixUrl ? (
          <>
            <p className="text-gray-700 mb-8 text-base sm:text-lg">
              Your mix is ready! Click the button below to download it.
            </p>
            <a
              href={mixUrl}
              download="mixed_songs.mp3"
              className="inline-block w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 transition"
              aria-label="Download your mixed audio file"
            >
              Download Mix
            </a>
          </>
        ) : (
          <p className="text-gray-600 text-base sm:text-lg">
            No mix found. Please return to the mixer and try again.
          </p>
        )}
      </div>
    </div>
  );
}