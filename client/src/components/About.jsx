import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// src/pages/About.jsx
export default function About() {
  const navigate = useNavigate();
  const data = {
    name: "Jayanth BB",
    email: "jayanth@example.com",
    phone: "9876543210",
    profession: "Full stack Developer",
  };
  const callAboutPage = async () => {
    try {
      const res = await fetch("http://localhost:5000/about", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await res.json();
      console.log(data);
      if (res.status !== 200) {
        const error = new Error(res.error);
        throw error;
      }
    } catch (err) {
      console.log(err);
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
        <p>
          <strong>Name:</strong> {data.name}
        </p>
        <p>
          <strong>Email:</strong> {data.email}
        </p>
        <p>
          <strong>Phone:</strong> {data.phone}
        </p>
        <p>
          <strong>Profession:</strong> {data.profession}
        </p>
      </div>
    </div>
  );
}
