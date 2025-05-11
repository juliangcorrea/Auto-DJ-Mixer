import PropTypes from "prop-types";

const StyledButton = ({
  text,
  onClick,
  variant = "primary",
  style = "",
  disabled = false,
  customBgColor = "", // New prop for custom background color
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-semibold transition-all";

  // Define button color variations based on the variant and customBgColor
  const variants = {
    primary: `px-6 py-3 bg-blue-500 text-white hover:bg-blue-600 cursor-pointer ${style}`,
    secondary: `px-6 py-3 bg-gray-500 text-white hover:bg-gray-600 ${style}`,
    danger: `px-6 py-3 bg-red-500 text-white hover:bg-red-600 ${style}`,
    custom: `px-6 py-3 ${customBgColor}-500 text-white hover:${customBgColor}-600 
    cursor-pointer ${style}`, // Custom background color logic
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.custom} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

StyledButton.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "custom"]),
  style: PropTypes.string,
  disabled: PropTypes.bool,
  customBgColor: PropTypes.string, // New prop for custom background color
};

export default StyledButton;
