import { useState } from "react";

export default function Download() {
  const [isMixing, setIsMixing] = useState(false);
  const [mixUrl, setMixUrl] = useState(null);

  // Mock function to simulate the mix generation and provide a download URL
  const generateMix = () => {
    setIsMixing(true);

    // Simulate a mix generation process
    setTimeout(() => {
      setMixUrl("https://www.example.com/path-to-mix.mp3"); // You will use the actual URL after generating the mix
      setIsMixing(false);
    }, 3000); // Simulate a 3-second wait
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      {/* Centered Box for the Download Section */}
      <div className="w-3/5 max-w-lg bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-4">Your Mix is Ready!</h2>

        {/* If the mix is being generated */}
        {isMixing ? (
          <div>
            <p className="text-gray-600">Your mix is being generated...</p>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-4">
              <div className="h-2 bg-blue-500 rounded-full w-1/2"></div> {/* Simulate progress */}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Your mix is ready! Click the button below to download it.
            </p>

            {/* Download Button, only visible once the mix is ready */}
            {mixUrl ? (
              <a
                href={mixUrl}
                download
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download Mix
              </a>
            ) : (
              <button
                onClick={generateMix}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Mix
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
