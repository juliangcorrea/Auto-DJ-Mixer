import { useState } from "react";

export default function Mixer() {
  const [files, setFiles] = useState([]);
  const maxFiles = 5;
  const maxSize = 50 * 1024 * 1024; // 50MB limit

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const fileCount = files.length;

  // Handle file selection and validation
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (fileCount + selectedFiles.length > maxFiles) return;
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  // Handle file deletion
  const handleDelete = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      {/* Left Section: File Upload */}
      <div className="w-3/5 max-w-lg bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Upload Your Songs</h2>
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg bg-gray-50 cursor-pointer">
          <input
            type="file"
            multiple
            accept="audio/*"
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
      <div className="w-2/5 max-w-lg bg-white p-6 rounded-lg shadow-md ml-10">
        <h3 className="text-xl font-semibold mb-4">Instructions</h3>
        <ol className="text-sm text-gray-600 list-decimal pl-4">
          <li>Upload up to {maxFiles} audio files (maximum size of {maxSize / (1024 * 1024)}MB per file).</li>
          <li>Press &quot;Mix&quot; to start the mixing process.</li>
          <li>Wait for the file to be generated.</li>
        </ol>

        {/* Mix Button */}
        <button className="w-full mt-6 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Start Mixing
        </button>
      </div>
    </div>
  );
}
