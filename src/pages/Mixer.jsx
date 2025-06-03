import { useState } from "react"
import StyledButton from "../components/common/StyledButton"
import LoadingOverlay from "../components/common/LoadingOverlay"
import ErrorDialog from "../components/common/ErrorDialog"
import { mixSongs } from "../audioAnalysis/audioAnalysisFunctions"

export default function Mixer() {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState({ visible: false, message: "" })
  const [selectedIndices, setSelectedIndices] = useState([])

  const MAX_FILES = 5
  const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

  const isValidMP3 = (file) => {
    const validTypes = ["audio/mpeg", "audio/mp3"]
    const hasValidExtension = file.name.toLowerCase().endsWith(".mp3")
    return validTypes.includes(file.type) || hasValidExtension
  }

  const showError = (message) => {
    setError({ visible: true, message })
  }

  const clearError = () => {
    setError({ visible: false, message: "" })
  }

  const handleFileChange = (event) => {
    clearError()
    const selectedFiles = Array.from(event.target.files)

    if (files.length + selectedFiles.length > MAX_FILES) {
      showError(`You can upload up to ${MAX_FILES} files only.`)
      return
    }

    const invalidFiles = selectedFiles.filter(
      (file) => !isValidMP3(file) || file.size > MAX_SIZE_BYTES
    )

    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        if (!isValidMP3(file)) {
          showError(`"${file.name}" is not a valid MP3 file.`)
        } else if (file.size > MAX_SIZE_BYTES) {
          showError(`"${file.name}" exceeds the 50MB size limit.`)
        }
      })
      return
    }

    const newUniqueFiles = selectedFiles.filter(
      (file) => !files.some((existing) => existing.name === file.name)
    )

    if (newUniqueFiles.length !== selectedFiles.length) {
      showError("Duplicate files are not allowed.")
    }

    setFiles((prev) => [...prev, ...newUniqueFiles])
    event.target.value = null
  }

  const deleteFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setSelectedIndices((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    )
  }

  const toggleSelect = (index) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else if (prev.length < 2) {
        return [...prev, index]
      }
      return prev
    })
  }

  const swapSelectedFiles = () => {
    clearError()
    if (selectedIndices.length !== 2) {
      showError("Please select exactly 2 songs to swap.")
      return
    }

    const [i, j] = selectedIndices
    setFiles((prev) => {
      const updated = [...prev]
      ;[updated[i], updated[j]] = [updated[j], updated[i]]
      return updated
    })

    setSelectedIndices([])
  }

  const handleGenerateMix = async () => {
    clearError()

    if (files.length < 2) {
      showError("Please upload at least two files to generate a mix.")
      return
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
      showError("Web Audio API is not supported in this browser.")
      return
    }

    setIsLoading(true)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    try {
      const decodeResults = await Promise.allSettled(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer()
          return await audioContext.decodeAudioData(arrayBuffer)
        })
      )

      const validBuffers = decodeResults
        .filter((res) => res.status === "fulfilled")
        .map((res) => res.value)
        .filter((buffer) => {
          const data = buffer.getChannelData(0)
          return data.some((sample) => sample !== 0)
        })

      if (validBuffers.length === 0) {
        showError("None of the files could be processed. Please upload valid MP3 files.")
        return
      }

      await mixSongs(validBuffers)
    } catch (error) {
      console.error("Error during mixing:", error)
      showError("There was an issue processing the files. Please try again.")
    } finally {
      await audioContext.close()
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen items-start lg:items-center justify-center bg-gray-100 p-4 sm:p-6 gap-6">
      {/* File Upload Section */}
      <section className="w-full lg:w-1/2 bg-white p-5 sm:p-6 rounded-xl shadow-md" aria-label="File upload section">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Upload Your Songs</h2>

        <div
          className="border-2 border-dashed border-gray-300 p-5 sm:p-6 rounded-lg bg-gray-50 text-center cursor-pointer"
          onClick={() => document.getElementById("fileInput").click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && document.getElementById("fileInput").click()}
          role="button"
          tabIndex={0}
        >
          <input
            type="file"
            multiple
            accept="audio/mp3"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <p className="text-gray-600">
            Tap to <span className="text-blue-500 underline">browse</span> or drag & drop your MP3s
          </p>
        </div>

        {error.visible && (
          <p className="mt-3 text-red-600 font-semibold text-sm sm:text-base" role="alert">
            {error.message}
          </p>
        )}

        <ul className="mt-4 divide-y text-sm text-gray-700">
          {files.map((file, index) => (
            <li key={file.name + index} className="py-2 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(index)}
                  onChange={() => toggleSelect(index)}
                />
                <span className="truncate w-40 sm:w-64">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </label>
              <button
                onClick={() => deleteFile(index)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Instructions and Actions Section */}
      <section className="w-full lg:w-1/3 bg-white p-5 sm:p-6 rounded-xl shadow-md flex flex-col items-center text-center">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">Instructions</h3>
        <ol className="text-sm text-gray-600 list-decimal pl-5 text-left w-full max-w-xs">
          <li>Upload up to {MAX_FILES} MP3 files (max 50MB each).</li>
          <li>Select two files to reorder (optional).</li>
          <li>Tap “Generate Mix” to start.</li>
        </ol>

        <div className="flex flex-col sm:flex-row gap-2 mt-6 w-full max-w-xs">
          <StyledButton
            text="Swap Selected"
            onClick={swapSelectedFiles}
            variant="custom"
            customBgColor="bg-yellow"
            aria-disabled={selectedIndices.length !== 2}
            disabled={selectedIndices.length !== 2}
          />
          <StyledButton
            text="Generate Mix"
            onClick={handleGenerateMix}
            disabled={files.length < 2 || isLoading}
          />
        </div>
      </section>

      {/* Loading and Error UI */}
      <LoadingOverlay isLoading={isLoading} />
      {error.visible && <ErrorDialog message={error.message} onClose={clearError} />}
    </div>
  )
}