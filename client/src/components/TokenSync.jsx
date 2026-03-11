import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// TokenSync - Handles cross-subdomain token synchronization
export default function TokenSync({ children }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const syncToken = async () => {
      const tokenParam = searchParams.get("token");
      const redirect = searchParams.get("redirect") || "/about";

      if (tokenParam) {
        try {
          // Call sync-token endpoint to set cookie on this subdomain
          const res = await fetch("http://localhost:5000/sync-token", {
            method: "GET",
            credentials: "include",
            headers: {
              paramstoken: tokenParam, // Pass token as header too for extra safety
            },
          });

          // Add token to URL for sync-token endpoint
          const syncRes = await fetch(
            `http://localhost:5000/sync-token?token=${tokenParam}`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (syncRes.status === 200) {
            // Token synced, store in localStorage too
            localStorage.setItem("token", tokenParam);
            // Redirect to intended page
            navigate(redirect);
          } else {
            console.log("Token sync failed");
            navigate("/login");
          }
        } catch (err) {
          console.log("Sync error:", err);
          navigate("/login");
        }
      }
    };

    syncToken();
  }, [searchParams, navigate]);

  return children;
}
