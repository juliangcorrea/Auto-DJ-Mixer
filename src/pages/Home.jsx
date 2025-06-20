import { FaGithub, FaLinkedin } from "react-icons/fa";
import StyledLink from "../components/common/StyledLink";

export default function HomePage() {
  return (
    <div className="bg-black text-white flex flex-col min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      <section
        className="min-h-[calc(100vh-4rem)] flex flex-col-reverse md:flex-row items-center justify-around w-full bg-gradient-to-r from-purple-900 via-black to-blue-900 text-white px-4 py-12 md:py-20"
        aria-label="Hero section"
      >
        <div className="md:w-1/2 flex justify-center">
          <div className="flex flex-col items-center justify-center md:items-start text-center md:text-left gap-6 mt-8 md:mt-0 max-w-md">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              Seamless Song Mixing
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300">
              Upload your tracks and let our AI create smooth transitions.
            </p>
            <StyledLink
              to="/mixer"
              text="Try it now"
              className="self-center bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 text-white font-semibold py-2 px-6 rounded transition-colors duration-200"
            />
          </div>
        </div>

        <div className="md:w-1/2 flex justify-center">
          <img
            src="https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?fit=crop&w=800&q=80"
            alt="DJ mixing music at a club"
            className="w-full max-w-xs sm:max-w-md md:max-w-lg rounded-2xl shadow-2xl"
            loading="lazy"
          />
        </div>
      </section>

      {/* Contact Section */}
      <section
        className="w-full flex flex-col justify-center items-center text-center bg-black text-white px-4 py-12"
        aria-label="Contact information"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Get in Touch</h2>
        <p className="mb-2">
          Email:{" "}
          <a
            href="mailto:example@email.com"
            className="underline hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded"
          >
            example@email.com
          </a>
        </p>
        <p className="mb-4">
          Phone:{" "}
          <a
            href="tel:+1234567890"
            className="underline hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded"
          >
            +123 456 7890
          </a>
        </p>
        <div className="flex flex-col sm:flex-row gap-6 mb-6 justify-center items-center">
          <a
            href="https://github.com/sampleuser"
            className="flex items-center text-xl hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded"
            aria-label="GitHub profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            <span className="ml-2">GitHub - sampleuser</span>
          </a>
          <a
            href="https://linkedin.com/in/sampleuser"
            className="flex items-center text-xl hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded"
            aria-label="LinkedIn profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
            <span className="ml-2">LinkedIn - sampleuser</span>
          </a>
        </div>
        <StyledLink
          to="/mixer"
          text="Try it now"
          className="bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 text-white font-semibold py-2 px-6 rounded transition-colors duration-200"
        />
      </section>
    </div>
  );
}