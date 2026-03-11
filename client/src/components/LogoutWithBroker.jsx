import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tokenBroker } from "../services/tokenBrokerService";

export default function LogoutWithBroker() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log("🔄 Logging out user...");

        // This calls the logout endpoint and clears the token
        await tokenBroker.logout();

        console.log("✓ Logout successful");

        // Redirect to login page
        navigate("/login");
      } catch (err) {
        console.error("❌ Logout error:", err);

        // Still redirect even if logout fails
        navigate("/login");
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Logging out...
        </h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
}
