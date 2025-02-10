import PropTypes from 'prop-types'

export default function ErrorDialog({ message, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
        <h3 className="text-xl font-semibold text-red-600">Default Error Message</h3>
        <p className="mt-4 text-gray-700">This is a customized error: {message}</p>
        <button onClick={onClose} className="mt-6 w-full bg-red-500 text-white py-2 rounded-lg cursor-pointer hover:bg-red-600">OK</button>
      </div>
    </div>
  );
}

ErrorDialog.propTypes = {
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
  }