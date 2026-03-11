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
      const currentHostname = window.location.hostname;
      const currentPort = window.location.port;

      if (tokenParam) {
        // Case 1: Token in URL (coming from another subdomain via SSO)
        try {
          console.log("TokenSync: Token found in URL, syncing...");

          const syncRes = await fetch(
            `http://localhost:5000/sync-token?token=${tokenParam}`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (syncRes.status === 200) {
            console.log("TokenSync: Token synced, storing in localStorage");
            localStorage.setItem("token", tokenParam);
            navigate(redirect);
          } else {
            console.log("TokenSync: Token sync failed");
            navigate("/login");
          }
        } catch (err) {
          console.log("TokenSync: Sync error:", err);
          navigate("/login");
        }
      } else {
        // Case 2: No token in URL
        const cookieToken = localStorage.getItem("token");

        if (cookieToken) {
          // Already have token in localStorage, do nothing
          console.log("TokenSync: Token already in localStorage");
          return;
        }

        // Check if we're on a subdomain (sub1, sub2, etc)
        const isSubdomain =
          currentHostname !== "localhost" &&
          !currentHostname.includes("127.0.0.1");

        if (isSubdomain) {
          // We're on a subdomain with no token - redirect to localhost to get token
          console.log(
            "TokenSync: On subdomain without token, redirecting to localhost...",
          );

          const loginUrl = `http://localhost:${currentPort || "5173"}/`;
          console.log("Redirecting to:", loginUrl);

          // Redirect to localhost home page where user can start SSO flow
          window.location.href = loginUrl;
        } else {
          // We're on localhost - try to get token from cookie
          try {
            console.log(
              "TokenSync: On localhost, trying to get token from cookie...",
            );

            const cookieRes = await fetch(
              "http://localhost:5000/get-cookie-token",
              {
                method: "GET",
                credentials: "include",
              },
            );

            if (cookieRes.status === 200) {
              const data = await cookieRes.json();
              console.log("TokenSync: Retrieved token from cookie");
              localStorage.setItem("token", data.token);
              // No reload needed, component will use it
            } else {
              console.log("TokenSync: No valid token in cookie");
              // User needs to login
            }
          } catch (err) {
            console.log("TokenSync: Cookie retrieval error:", err);
            // User needs to login
          }
        }
      }
    };

    syncToken();
  }, [searchParams, navigate]);

  return children;
}
