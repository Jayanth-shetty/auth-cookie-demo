export default function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-6xl font-bold text-red-500">404</h1>

      <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>

      <p className="text-gray-600 mt-2">
        The page you are looking for does not exist.
      </p>

      <a
        href="/"
        className="mt-6 bg-amber-500 text-white px-6 py-2 rounded-md hover:bg-amber-600 transition"
      >
        Go Home
      </a>
    </div>
  );
}
