import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token");
        console.log("Logout: Starting logout process");
        console.log("Token in localStorage:", token ? "exists" : "missing");

        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Call logout endpoint (POST now instead of GET)
        console.log("Calling /logout endpoint...");
        const res = await fetch("http://localhost:5000/logout", {
          method: "POST",
          credentials: "include", // Important: sends cookies
          headers: headers,
        });

        const data = await res.json();
        console.log("✓ Server response:", data);

        // Clear token from localStorage
        localStorage.removeItem("token");
        console.log("✓ Cleared localStorage token");
        console.log(
          "Verification - token in localStorage after clear:",
          localStorage.getItem("token")
            ? "STILL EXISTS!"
            : "completely removed",
        );

        // Small delay to ensure server processed the request
        setTimeout(() => {
          console.log("Redirecting to /login");
          navigate("/login");
        }, 300);
      } catch (err) {
        console.error("Logout error:", err);
        // Clear localStorage anyway
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    handleLogout();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Logging out...</p>
    </div>
  );
}
