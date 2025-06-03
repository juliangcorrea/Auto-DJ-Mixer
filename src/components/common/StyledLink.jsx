import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

const StyledLink = ({ text, to, className = '' }) => {
  return (
    <Link
      to={to}
      className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all text-center ${className}`}
      aria-label={text}
      tabIndex={0}
    >
      {text}
    </Link>
  )
}

StyledLink.propTypes = {
  text: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  className: PropTypes.string,
}

export default StyledLink