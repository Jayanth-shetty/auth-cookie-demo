import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// src/pages/About.jsx
export default function About() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  const callAboutPage = async () => {
    try {
      // Get token from localStorage (fallback if not in localStorage, cookie will be used)
      const token = localStorage.getItem("token");

      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Always include Authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Send request with both cookie + Authorization header for maximum compatibility
      const res = await fetch("http://localhost:5000/check-auth", {
        method: "GET",
        headers: headers,
        credentials: "include", // Also sends cookie if available
      });

      const responseData = await res.json();
      console.log("Auth response:", responseData);

      if (res.status === 200) {
        setUserData(responseData.user);
      } else {
        console.log("Auth failed:", responseData);
        navigate("/login");
      }
    } catch (err) {
      console.log("Error:", err);
      navigate("/login");
    }
  };

  useEffect(() => {
    callAboutPage();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">About Me</h1>
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md space-y-4">
        {userData ? (
          <>
            <p>
              <strong>Name:</strong> {userData.name}
            </p>
            <p>
              <strong>Email:</strong> {userData.email}
            </p>
            <p>
              <strong>Phone:</strong> {userData.phone}
            </p>
            <p>
              <strong>Profession:</strong> {userData.work}
            </p>
          </>
        ) : (
          <p>Loading your profile...</p>
        )}
      </div>
    </div>
  );
}
