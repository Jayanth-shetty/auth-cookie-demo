import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Clear token from localStorage (works across all subdomains)
        localStorage.removeItem("token");

        // Call backend logout endpoint to clear cookie
        await fetch("http://localhost:5000/logout", {
          method: "GET",
          credentials: "include",
        });

        navigate("/login");
      } catch (err) {
        console.log(err);
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
