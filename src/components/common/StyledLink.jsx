import PropTypes from 'prop-types';
import { Link } from "react-router-dom";

const StyledLink = ({ text, to, style = "" }) => {
  return (
    <Link to={to} className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg ${style}`}>
      {text}
    </Link>
  )
}

StyledLink.propTypes = {
  text: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  style: PropTypes.string,
};

export default StyledLink;