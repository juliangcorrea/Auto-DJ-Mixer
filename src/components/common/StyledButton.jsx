import PropTypes from "prop-types"

const allowedColors = {
  yellow: "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer",
  green: "bg-green-500 text-white hover:bg-green-600 cursor-pointer",
  red: "bg-red-500 text-white hover:bg-red-600 cursor-pointer",
  blue: "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer",
  gray: "bg-gray-500 text-white hover:bg-gray-600 cursor-pointer",
}

const StyledButton = ({
  text,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  customBgColor = "",
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"

  const getCustomColorClasses = (color) => allowedColors[color] || ""

  const variants = {
    primary: `px-6 py-3 ${allowedColors.blue} ${className}`,
    secondary: `px-6 py-3 ${allowedColors.gray} ${className}`,
    danger: `px-6 py-3 ${allowedColors.red} ${className}`,
    custom: `px-6 py-3 ${getCustomColorClasses(customBgColor)} ${className}`,
  }

  const variantClasses = variants[variant] || variants.custom
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : ""

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantClasses} ${disabledClasses}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {text}
    </button>
  )
}

StyledButton.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "custom"]),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  customBgColor: PropTypes.oneOf(Object.keys(allowedColors)),
}

export default StyledButton