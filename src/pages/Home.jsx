import { useState } from "react";
import { FaGithub, FaLinkedin, FaBars, FaTimes } from "react-icons/fa";
import StyledLink from "../components/common/StyledLink";

const NAV_LINKS = [
  { to: "/", text: "Home" },
  { to: "/mixer", text: "Mixer" },
  { to: "/testing", text: "Testing" },
  { to: "/contact", text: "Contact" },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="w-full bg-gray-900 text-white shadow-md sticky top-0 z-50">
        <nav className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-8 h-8"
              loading="lazy"
            />
            <span className="font-bold text-xl">SongMixerAI</span>
          </div>
          {/* Desktop Menu */}
          <ul className="hidden md:flex gap-6 items-center">
            {NAV_LINKS.map((link) => (
              <li key={link.text}>
                <StyledLink to={link.to} text={link.text} />
              </li>
            ))}
          </ul>
          {/* Hamburger */}
          <button
            className="md:hidden text-2xl"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <FaBars />
          </button>
        </nav>
        {/* Mobile Menu */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-70 z-50 transition-opacity duration-300 ${
            menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className={`fixed top-0 right-0 w-64 h-full bg-gray-900 text-white p-6 shadow-lg transform transition-transform duration-300 ${
              menuOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-2xl"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <FaTimes />
            </button>
            <ul className="flex flex-col gap-6 mt-12">
              {NAV_LINKS.map((link) => (
                <li key={link.text}>
                  <StyledLink to={link.to} text={link.text} onClick={() => setMenuOpen(false)} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="flex flex-col-reverse md:flex-row items-center justify-center w-full flex-1 bg-gray-800 text-white px-4 py-12 md:py-20"
        aria-label="Hero section"
      >
        <div className="md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left mt-8 md:mt-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Seamless Song Mixing
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 max-w-md">
            Upload your tracks and let our AI create smooth transitions.
          </p>
          <div className="flex gap-4 flex-wrap justify-center md:justify-start">
            <StyledLink to="/mixer" text="Try it now" />
            <StyledLink to="/testing" text="Learn More" />
          </div>
        </div>
        <div className="md:w-1/2 flex justify-center">
          <img
            src="https://blogassets.leverageedu.com/blog/wp-content/uploads/2019/12/23174648/B-Tech-Degree-800x500.png"
            alt="Hero showcasing seamless song mixing"
            className="w-full max-w-xs sm:max-w-md md:max-w-lg rounded-2xl shadow-lg"
            loading="lazy"
          />
        </div>
      </section>

      {/* App Info Section */}
      <section
        className="w-full bg-gray-100 px-4 py-12"
        aria-label="Application information steps"
      >
        <div className="max-w-6xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className="p-6 bg-white shadow-md rounded-lg text-center flex flex-col items-center"
            >
              <img
                src="https://img.freepik.com/vector-gratis/vector-fondo-diseno-pieza-papel-rasgado_1055-12723.jpg?t=st=1738784681~exp=1738788281~hmac=9eaf36e5d9cdbe49571757b7be583fd61c27eceedb46d5be61bfbcb7475fc0ca&w=740"
                alt={`Step ${step} illustration`}
                className="w-full h-40 object-cover rounded-md mb-4"
                loading="lazy"
              />
              <h3 className="text-lg font-semibold">Step {step}</h3>
              <p className="mt-2 text-gray-600">Brief description of step {step}.</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section
        className="w-full flex flex-col justify-center items-center text-center bg-gray-900 text-white px-4 py-12"
        aria-label="Contact information"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Get in Touch</h2>
        <p className="mb-2">
          Email:{" "}
          <a
            href="mailto:example@email.com"
            className="underline hover:text-gray-400"
          >
            example@email.com
          </a>
        </p>
        <p className="mb-4">
          Phone:{" "}
          <a
            href="tel:+1234567890"
            className="underline hover:text-gray-400"
          >
            +123 456 7890
          </a>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center items-center">
          <a
            href="https://github.com/sampleuser"
            className="flex items-center text-xl hover:text-gray-400"
            aria-label="GitHub profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            <span className="ml-2">GitHub - sampleuser</span>
          </a>
          <a
            href="https://linkedin.com/in/sampleuser"
            className="flex items-center text-xl hover:text-gray-400"
            aria-label="LinkedIn profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
            <span className="ml-2">LinkedIn - sampleuser</span>
          </a>
        </div>
        <StyledLink to="/mixer" text="Try it now" />
      </section>
    </div>
  );
}
