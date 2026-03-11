import { useEffect, useState } from "react";

export default function Home() {
  const [token, setToken] = useState(null);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    setHostname(window.location.hostname);
  }, []);

  const getSubdomainLink = (subdomain) => {
    const currentPort = window.location.port || "5173";
    const protocol = window.location.protocol;

    if (token) {
      // Pass token as query param to sync-token endpoint on the new subdomain
      let baseUrl = `${protocol}//${subdomain}.localhost:${currentPort}`;
      return `${baseUrl}?token=${token}&redirect=/about`;
    } else {
      return `${protocol}//${subdomain}.localhost:${currentPort}/login`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">Welcome</h1>

        <p className="text-lg text-gray-600 mb-8">
          A full stack authentication system built with React, Node.js, MongoDB,
          JWT cookies and SSO.
        </p>

        <div className="flex justify-center gap-4 mb-8">
          <a
            href="/signup"
            className="bg-blue-300 hover:bg-blue-600 text-gray-900 px-6 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </a>

          <a
            href="/login"
            className="border border-blue-500 text-blue-500 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Login
          </a>
        </div>

        {/* SSO Cross-Subdomain Links */}
        {token && (
          <div className="mt-12 bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🔐 Single Sign-On (SSO)
            </h2>
            <p className="text-gray-600 mb-6">
              You are logged in on <strong>{hostname}</strong>. Access your
              profile on other subdomains:
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={getSubdomainLink("sub1")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Access Profile on sub1.localhost
              </a>

              <a
                href={getSubdomainLink("sub2")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Access Profile on sub2.localhost
              </a>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              💡 Tip: Token is automatically synced across subdomains
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
