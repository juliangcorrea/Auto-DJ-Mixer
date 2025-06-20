import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StyledButton from "../components/common/StyledButton";

export default function DownloadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [fileName, setFileName] = useState("mixed-song.mp3");

  useEffect(() => {
    if (!location.state || !location.state.blob) {
      navigate("/", { replace: true });
      return;
    }

    const { blob, fileName: name } = location.state;
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    if (name) setFileName(name);

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [location, navigate]);

  if (!downloadUrl) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-black via-purple-900 via-blue-900 to-black text-white p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-pink-400">
        Your Mix is Ready!
      </h1>
      <a
        href={downloadUrl}
        download={fileName}
        className="inline-block px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-pink-300"
        aria-label="Download mixed MP3 file"
      >
        Download Mixed Song
      </a>
      <StyledButton
        text="Mix More Songs"
        onClick={() => navigate("/mixer")}
        className="mt-4 bg-blue-600 hover:bg-blue-700 focus:ring-blue-400"
      />
    </div>
  );
}