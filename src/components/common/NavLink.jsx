import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const NavLink = ({ to, children }) => {
  return (
    <Link to={to} className="hover:text-gray-400">
      {children}
    </Link>
  );
};

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default NavLink;