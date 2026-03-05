export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">Welcome</h1>

        <p className="text-lg text-gray-600 mb-8">
          A full stack authentication system built with React, Node.js, MongoDB
          and JWT cookies.
        </p>

        <div className="flex justify-center gap-4">
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
      </div>
    </div>
  );
}
