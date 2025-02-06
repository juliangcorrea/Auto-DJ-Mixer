import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import HomePage from './pages/Home'
import Mixer from './pages/Mixer'
import Download from './pages/Download'

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
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)