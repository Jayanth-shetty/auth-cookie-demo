import { Navigate } from "react-router-dom";
import { useTokenBroker } from "../hooks/useTokenBroker";

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if no valid token
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useTokenBroker();

  // While checking authentication, show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the component
  return children;
}
