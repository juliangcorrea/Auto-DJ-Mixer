import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen((prev) => !prev)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="w-full bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-4 md:py-5">
        {/* Site Title */}
        <div className="flex items-center gap-2">
            <img 
              src="/src/assets/react.svg"
              alt="Logo"
              className="w-8 h-8"
              loading="lazy"
            />
            <Link to="/" className="text-2xl font-bold tracking-tight hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
              My Website
            </Link>
        </div>
        
        {/* Hamburger Button (Mobile only) */}
        <button
          className="md:hidden text-2xl focus:outline-none focus:ring-2 focus:ring-white rounded"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          ☰
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:block" aria-label="Primary navigation">
          <ul className="flex gap-6 text-base font-medium">
            {['/', '/mixer', '/download', '/testing'].map((path, index) => {
              const labels = ['Home', 'Mixer', 'Download', 'Testing']
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      `transition-colors hover:text-blue-400 ${
                        isActive ? 'text-blue-400' : ''
                      }`
                    }
                  >
                    {labels[index]}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden px-4 pb-4 space-y-2"
          aria-label="Mobile navigation"
        >
          {['/', '/mixer', '/download'].map((path, index) => {
            const labels = ['Home', 'Mixer', 'Download']
            return (
              <NavLink
                key={path}
                to={path}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block text-center py-2 rounded hover:text-blue-400 transition-colors ${
                    isActive ? 'text-blue-400' : ''
                  }`
                }
              >
                {labels[index]}
              </NavLink>
            )
          })}
        </nav>
      )}
    </header>
  )
}

export default Header