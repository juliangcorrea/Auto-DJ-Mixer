function Footer() {
  return (
    <footer className="w-full h-[10vh] bg-gray-800 text-white flex items-center justify-center text-center px-6 py-4 md:px-8 md:py-6">
      <p className="text-sm md:text-base">&copy; {new Date().getFullYear()} My Website. All rights reserved.</p>
    </footer>
  );
}

export default Footer;