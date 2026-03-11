import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// src/pages/About.jsx
export default function About() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const callAboutPage = async () => {
    try {
      setLoading(true);

      // Get token from localStorage first (for cross-subdomain SSO)
      let token = localStorage.getItem("token");
      console.log(
        "About: Token in localStorage:",
        token ? "exists" : "missing",
      );

      // If no localStorage token, try to get from cookie via endpoint
      if (!token) {
        console.log(
          "About: No localStorage token, attempting to sync from cookie...",
        );
        try {
          const syncRes = await fetch(
            "http://localhost:5000/get-cookie-token",
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (syncRes.status === 200) {
            const syncData = await syncRes.json();
            token = syncData.token;
            console.log("About: Successfully retrieved token from cookie");
            localStorage.setItem("token", token);
          }
        } catch (syncErr) {
          console.log("About: Could not sync token from cookie:", syncErr);
        }
      }

      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Use Authorization header (works across subdomains)
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log("About: Sending Authorization header");
      }

      const res = await fetch("http://localhost:5000/check-auth", {
        method: "GET",
        headers: headers,
        credentials: "include",
      });

      const responseData = await res.json();
      console.log("About: Auth response status:", res.status);

      if (res.status === 200) {
        console.log("About: Authentication successful, showing user data");
        setUserData(responseData.user);
        setLoading(false);
      } else {
        console.log(
          "About: Authentication failed, clearing token and redirecting",
        );
        localStorage.removeItem("token");
        setLoading(false);
        navigate("/login");
      }
    } catch (err) {
      console.log("About: Error:", err);
      localStorage.removeItem("token");
      setLoading(false);
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
