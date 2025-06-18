import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import StyledButton from "../components/common/StyledButton"

export default function DownloadPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [fileName, setFileName] = useState("mixed-song.mp3")

  useEffect(() => {
    // Check if blob is passed via state, otherwise redirect to home
    if (!location.state || !location.state.blob) {
      navigate("/", { replace: true })
      return
    }

    const { blob, fileName: name } = location.state
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    if (name) setFileName(name)

    // Clean up blob URL on unmount
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [location, navigate])

  if (!downloadUrl) {
    // While waiting or redirecting
    return null
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Your Mix is Ready!</h1>
      <a
        href={downloadUrl}
        download={fileName}
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Download mixed MP3 file"
      >
        Download Mixed Song
      </a>
    </div>
  )
}