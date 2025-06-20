import { useState } from 'react'
import { Link } from 'react-router-dom'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen((prev) => !prev)

  return (
    <header className="w-full bg-black text-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-4 md:py-5">
        {/* Site Title with DJ Headset Icon */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 text-pink-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              fill="currentColor"
            >
              <path d="M32 4C17.64 4 5.64 16 5.64 30.36V44a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V30.36C19.64 20.3 25.94 12 32 12s12.36 8.3 12.36 18.36V44a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V30.36C58.36 16 46.36 4 32 4zm-16 26.36V42h-4V30.36C12 20.52 20.52 12 32 12s20 8.52 20 18.36V42h-4V30.36C48 21.04 40.96 14 32 14S16 21.04 16 30.36z"/>
            </svg>
          </div>
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight hover:text-pink-400"
          >
            My Mixer
          </Link>
        </div>

        {/* Hamburger Button (Mobile only) */}
        <button
          className="md:hidden text-2xl focus:outline-none focus:ring-0 rounded"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

export default Header