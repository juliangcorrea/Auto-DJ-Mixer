import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { Link } from "react-router-dom";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center w-full">

      <Header />

      {/* Hero Section */}
      <section className="relative w-full h-[calc(100vh-64px)] flex items-center bg-gray-800 text-white px-8">
        <div className="flex-1">
          <img
            src="https://blogassets.leverageedu.com/blog/wp-content/uploads/2019/12/23174648/B-Tech-Degree-800x500.png"
            alt="Hero"
            className="w-full max-w-lg mx-auto rounded-2xl shadow-lg"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold mb-4">Seamless Song Mixing</h1>
          <p className="text-lg mb-6">Upload your tracks and let our AI create smooth transitions.</p>
          <Link
            to="/mixer"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Try It Now
          </Link>
        </div>
      </section>

      {/* App Info Section */}
      <section className="w-full h-screen bg-gray-100 grid gap-0 md:grid-cols-3 items-center px-6">
        <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-xs mx-auto">
          <img
            src="https://img.freepik.com/vector-gratis/vector-fondo-diseno-pieza-papel-rasgado_1055-12723.jpg?t=st=1738784681~exp=1738788281~hmac=9eaf36e5d9cdbe49571757b7be583fd61c27eceedb46d5be61bfbcb7475fc0ca&w=740"
            alt="Step 1"
            className="w-full h-40 object-cover rounded-md mb-4"
          />
          <h3 className="text-xl font-semibold">Step 1</h3>
          <p className="mt-2 text-gray-600">Brief description of step 1.</p>
        </div>
        <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-xs mx-auto">
          <img
            src="https://img.freepik.com/vector-gratis/vector-fondo-diseno-pieza-papel-rasgado_1055-12723.jpg?t=st=1738784681~exp=1738788281~hmac=9eaf36e5d9cdbe49571757b7be583fd61c27eceedb46d5be61bfbcb7475fc0ca&w=740"
            alt="Step 2"
            className="w-full h-40 object-cover rounded-md mb-4"
          />
          <h3 className="text-xl font-semibold">Step 2</h3>
          <p className="mt-2 text-gray-600">Brief description of step 2.</p>
        </div>
        <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-xs mx-auto">
          <img
            src="https://img.freepik.com/vector-gratis/vector-fondo-diseno-pieza-papel-rasgado_1055-12723.jpg?t=st=1738784681~exp=1738788281~hmac=9eaf36e5d9cdbe49571757b7be583fd61c27eceedb46d5be61bfbcb7475fc0ca&w=740"
            alt="Step 3"
            className="w-full h-40 object-cover rounded-md mb-4"
          />
          <h3 className="text-xl font-semibold">Step 3</h3>
          <p className="mt-2 text-gray-600">Brief description of step 3.</p>
        </div>
      </section>

      {/* Final Section */}
      <section className="w-full h-[calc(100vh-56px)] flex flex-col justify-center items-center text-center bg-gray-900 text-white p-6">
        <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
        <p className="mb-2">Email: example@email.com</p>
        <p className="mb-4">Phone: +123 456 7890</p>
        <div className="flex flex-col gap-4 mb-6">
          <a href="#" className="flex items-center text-2xl hover:text-gray-400">
            <FaGithub />
            <span className="ml-2">GitHub - sampleuser</span>
          </a>
          <a href="#" className="flex items-center text-2xl hover:text-gray-400">
            <FaLinkedin />
            <span className="ml-2">LinkedIn - sampleuser</span>
          </a>
        </div>
        <Link
          to="/mixer"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg"
        >
          Try It Now
        </Link>
      </section>

      <Footer />

    </div>
  );
}