import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [pseudo, setPseudo] = useState("");
  const [userTag, setUserTag] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = () => {
    if (!pseudo || !userTag || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (userTag.length !== 4) {
      setError("User tag must be exactly 4 characters.");
      return;
    }

    // Save dummy user to localStorage (simulate backend)
    localStorage.setItem("user", JSON.stringify({ email }));
    alert("Registration successful! You can now log in.");
    navigate("/login"); // Redirect to login page
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="bg-[#24221b] p-6 rounded-lg shadow-lg w-80">
        <h1 className="text-2xl font-bold mb-4 text-center">📝 Register</h1>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-black dark:text-white"
        />
        <input
          type="text"
          placeholder="User Tag (4 chars)"
          value={userTag}
          onChange={(e) => setUserTag(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-black dark:text-white"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-black dark:text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-black dark:text-white"
        />
        <button
          onClick={handleRegister}
          className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 rounded transition"
        >
          Register
        </button>
        <p className="text-sm text-center mt-3">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
