import "./App.css";
import Navbar from "./components/Navbar";
import TokenSync from "./components/TokenSync";
import { Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Contact from "./components/Contact";
import About from "./components/About";
import ErrorPage from "./components/ErrorPage";

function App() {
  return (
    <TokenSync>
      <>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/error" element={<ErrorPage />} />
        </Routes>
      </>
    </TokenSync>
  );
}

export default App;
