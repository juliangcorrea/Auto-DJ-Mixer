import { useState } from "react";
import StyledButton from "../components/common/StyledButton"
import LoadingOverlay from "../components/common/LoadingOverlay"
import ErrorDialog from "../components/common/ErrorDialog"

export default function Mixer() {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  
  const maxFiles = 5;
  const maxSize = 50 * 1024 * 1024
  const maxTotalSize = 200 * 1024 * 1024
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const fileCount = files.length
  
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    if (selectedFiles.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    const newTotalSize = selectedFiles.reduce((acc, file) => acc + file.size, totalSize)
    if (newTotalSize > maxTotalSize) {
      alert(`The total file size cannot exceed ${(maxTotalSize / (1024 * 1024)).toFixed(2)}MB.`)
      return
    }
    if (fileCount + selectedFiles.length > maxFiles) return
    const validFiles = selectedFiles.filter((file) => {
      if (file.type !== "audio/mpeg") {
        alert(`${file.name} is not a valid mp3 file.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the 50MB size limit.`);
        return false;
      }
      return true;
    })
    setFiles((prevFiles) => [...prevFiles, ...validFiles])
  };
  

  // Handle file deletion
  const handleDelete = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Handle the mix generation (trigger loading)
  const handleGenerateMix = () => {
    setIsLoading(true); // Start loading animation
    setTimeout(() => {
      // Simulate mixing process (e.g., using a setTimeout here for testing)
      setIsLoading(false); // Stop loading animation after 3 seconds
    }, 3000);
  }

  const simulateError = () => {
    setErrorMessage("An unexpected error occurred. Please try again later.");
    setShowError(true)
  }

  const handleCloseErrorDialog = () => {
    setShowError(false);
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen items-center justify-center bg-gray-100 p-6">
      {/* Left Section: File Upload */}
      <div className="w-full min-h-[40vh] lg:w-3/5 max-w-lg bg-white p-6 rounded-lg shadow-md mb-6 lg:mb-0">
        <h2 className="text-2xl font-semibold mb-4">Upload Your Songs</h2>
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg bg-gray-50 cursor-pointer">
          <input
            type="file"
            multiple
            accept="audio/mp3"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className="block text-gray-600 cursor-pointer">
            Drag & Drop files here or <span className="text-blue-500 underline">browse</span>
          </label>
        </div>

        {/* Upload Progress */}
        <div className="mt-4 w-full">
          <p className="text-gray-600 text-sm">
            {fileCount}/{maxFiles} files uploaded – {(totalSize / (1024 * 1024)).toFixed(2)}MB / {(maxSize / (1024 * 1024)).toFixed(2)}MB
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
            <div
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${(totalSize / maxSize) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Display uploaded files with delete option */}
        <ul className="mt-4 text-left text-sm text-gray-700">
          {files.map((file, index) => (
            <li key={index} className="flex justify-between items-center border-b py-2">
              <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
              <button
                onClick={() => handleDelete(index)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Section: Instructions and Mixing Button */}
      <div className="w-full min-h-[40vh] lg:w-2/5 max-w-lg bg-white p-6 rounded-lg shadow-md lg:ml-10 flex flex-col items-center">
        <h3 className="text-xl font-semibold mb-4">Instructions</h3>
        <ol className="text-sm text-gray-600 list-decimal pl-4">
          <li>Upload up to {maxFiles} audio files (maximum size of {maxSize / (1024 * 1024)}MB per file).</li>
          <li>Press &quot;Mix&quot; to start the mixing process.</li>
          <li>Wait for the file to be generated.</li>
        </ol>

        {/* Mix Button */}
        <StyledButton text="Generate Mix" style="mt-5" onClick={handleGenerateMix} />
        <button onClick={simulateError} className="mt-5 px-4 py-2 bg-red-500 text-white rounded cursor-pointer">Simulate Error</button>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />

      {showError && (<ErrorDialog message={errorMessage} onClose={handleCloseErrorDialog} />)}
    </div>
  );
}
