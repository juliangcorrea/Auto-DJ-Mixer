import { useState } from "react";
import StyledButton from "../components/common/StyledButton";
import LoadingOverlay from "../components/common/LoadingOverlay";
import ErrorDialog from "../components/common/ErrorDialog";

export default function Mixer() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedForSwap, setSelectedForSwap] = useState([]);

  const maxFiles = 5;
  const maxSize = 50 * 1024 * 1024; // 50MB

  const isValidMP3 = (file) => {
    const validTypes = ["audio/mpeg", "audio/mp3"];
    const validExtension = file.name.toLowerCase().endsWith(".mp3");
    return validTypes.includes(file.type) || validExtension;
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      if (!isValidMP3(file)) {
        alert(`${file.name} is not a valid MP3 file.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the 50MB size limit.`);
        return false;
      }
      return true;
    });

    const newUniqueFiles = validFiles.filter(
      (file) => !files.some((existing) => existing.name === file.name)
    );

    if (newUniqueFiles.length !== validFiles.length) {
      alert("Duplicate files are not allowed.");
    }

    setFiles((prev) => [...prev, ...newUniqueFiles]);
  };

  const deleteFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedForSwap((prev) => prev.filter((i) => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  const toggleSelect = (index) => {
    setSelectedForSwap((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : prev.length < 2
        ? [...prev, index]
        : prev
    );
  };

  const swapSelectedFiles = () => {
    if (selectedForSwap.length !== 2) {
      alert("Please select exactly 2 songs to swap.");
      return;
    }

    const [i, j] = selectedForSwap;
    const updatedFiles = [...files];
    [updatedFiles[i], updatedFiles[j]] = [updatedFiles[j], updatedFiles[i]];
    setFiles(updatedFiles);
    setSelectedForSwap([]);
  };

  const handleGenerateMix = async () => {
    if (files.length < 2) {
      alert("Please upload at least two files to generate a mix.");
      return;
    }

    setIsLoading(true);

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffersResults = await Promise.allSettled(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return await audioContext.decodeAudioData(arrayBuffer);
        })
      );

      const successfulBuffers = audioBuffersResults
        .filter((res) => res.status === "fulfilled")
        .map((res) => res.value)
        .filter((buffer) => {
          const channelData = buffer.getChannelData(0);
          return channelData.some((sample) => sample !== 0); // Ignore silent files
        });

      if (successfulBuffers.length === 0) {
        setErrorMessage("None of the files could be processed. Please upload valid MP3 files.");
        setShowError(true);
        await audioContext.close();
        setIsLoading(false);
        return;
      }

      await mixSongs(successfulBuffers); // Replace with your actual mixing function
      console.log("Finished processing...");

      await audioContext.close();
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing files:", error);
      setErrorMessage("There was an issue processing the files. Please try again.");
      setShowError(true);
      setIsLoading(false);
    }
  };

  const handleCloseErrorDialog = () => {
    setShowError(false);
  };

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

      {/* Display uploaded files with delete option */}
      <ul className="mt-4 text-left text-sm text-gray-700">
        {files.map((file, index) => (
          <li key={index} className="flex justify-between items-center border-b py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedForSwap.includes(index)}
                onChange={() => toggleSelect(index)}
              />
              <span>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
              </span>
            </div>
            <button
              onClick={() => deleteFile(index)}
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
        <li>Upload up to {maxFiles} MP3 files (maximum size of {maxSize / (1024 * 1024)}MB per file).</li>
        <li>Press &quot;Generate Mix&quot; to start the mixing process.</li>
        <li>Wait for the file to be generated.</li>
      </ol>

      {/* Buttons for actions */}
      <div className="flex gap-2 mt-5">
        <StyledButton text="Swap Selected"
          onClick={swapSelectedFiles}
          variant="custom"
          customBgColor="bg-yellow"
          style="mt-5"
        />
        <StyledButton text="Generate Mix" style="mt-5" onClick={handleGenerateMix} />
      </div>
    </div>

    {/* Loading Overlay */}
    <LoadingOverlay isLoading={isLoading} />

    {/* Error Dialog */}
    {showError && (<ErrorDialog message={errorMessage} onClose={handleCloseErrorDialog} />)}
  </div>
);

}