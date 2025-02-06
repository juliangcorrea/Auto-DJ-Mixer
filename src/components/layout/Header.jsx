import { Link } from "react-router-dom";
import NavLink from "../common/NavLink";

function Header() {
  return (
    <header className="w-full bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          My Website
        </Link>
        <nav>
          <ul className="flex gap-6">
            <li>
              <NavLink to="/">Home</NavLink>
            </li>
            <li>
              <NavLink to="/mixer">Mixer</NavLink>
            </li>
            <li>
              <NavLink to="/download">Download</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;