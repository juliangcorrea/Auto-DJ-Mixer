import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full h-[10vh] bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          My Website
        </Link>

        {/* Hamburger Menu (Visible on small screens) */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>

        {/* Navigation (Hidden on small screens, visible on medium+) */}
        <nav className={`md:block ${isMenuOpen ? 'block' : 'hidden'}`}>
          <ul className="flex gap-6">
            <li>
              <NavLink to="/" activeclassname="text-blue-400">
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/mixer" activeclassname="text-blue-400">
                Mixer
              </NavLink>
            </li>
            <li>
              <NavLink to="/download" activeclassname="text-blue-400">
                Download
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Mobile Menu (Visible when the hamburger is clicked) */}
      {isMenuOpen && (
        <div className="md:hidden flex flex-col items-center mt-4">
          <NavLink to="/" onClick={() => setIsMenuOpen(false)} className="py-2">Home</NavLink>
          <NavLink to="/mixer" onClick={() => setIsMenuOpen(false)} className="py-2">Mixer</NavLink>
          <NavLink to="/download" onClick={() => setIsMenuOpen(false)} className="py-2">Download</NavLink>
        </div>
      )}
    </header>
  );
}

export default Header;