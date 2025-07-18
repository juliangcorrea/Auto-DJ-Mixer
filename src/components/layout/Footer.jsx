function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      role="contentinfo"
      className="w-full bg-black text-gray-300 flex items-center justify-center text-center px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6"
    >
      <p className="text-sm sm:text-base">
        &copy; {currentYear} <span className="text-pink-400">My Mixer</span>. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer