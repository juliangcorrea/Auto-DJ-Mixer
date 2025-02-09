import PropTypes from "prop-types";

const StyledButton = ({ text, onClick, variant = "primary", style="", disabled = false }) => {
    const baseStyles = "px-4 py-2 rounded-lg font-semibold transition-all";
    const variants = {
      primary: `px-6 py-3 bg-blue-500 text-white hover:bg-blue-600 cursor-pointer ${style}`,
      secondary: `px-6 py-3 bg-gray-500 text-white hover:bg-gray-600 ${style}`,
      danger: `px-6 py-3 bg-red-500 text-white hover:bg-red-600 ${style}`,
    }
  
    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={onClick}
        disabled={disabled}
      >
        {text}
      </button>
    )
  }

StyledButton.propTypes =  {
    text: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.oneOf(["primary", "secondary", "danger"]),
    style: PropTypes.string,
    disabled: PropTypes.bool,
}

export default StyledButton