export default function Mixer() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Upload Box */}
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">Upload Your Songs</h2>
        <div className="border-2 border-dashed border-gray-300 p-10 rounded-lg bg-gray-50 cursor-pointer">
          <p className="text-gray-600">Drag & drop files here</p>
          <p className="text-gray-400 text-sm">or</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md">Browse Files</button>
        </div>
      </div>
      
      {/* File Preview */}
      <div className="w-full max-w-lg mt-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Selected Files</h3>
        <div className="border border-gray-300 p-2 rounded bg-gray-50 text-gray-600 text-sm text-center">
          No files selected
        </div>
      </div>

      {/* Upload Progress Placeholder */}
      <div className="w-full max-w-lg mt-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Upload Progress</h3>
        <div className="w-full bg-gray-200 h-4 rounded-full">
          <div className="bg-blue-600 h-4 rounded-full w-0"></div>
        </div>
      </div>
    </div>
  );
}
