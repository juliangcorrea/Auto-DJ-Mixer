import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import HomePage from './pages/Home'
import Mixer from './pages/Mixer'
import Download from './pages/Download'
import TestMixer from './pages/Testing.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>,
    children: [
      {
        path: "/",
        element: <HomePage />
      },
      {
        path: "/mixer",
        element: <Mixer />
      },
      {
        path: "/download",
        element: <Download />
      },
      {
        path: "/testing",
        element: <TestMixer />
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)