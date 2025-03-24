import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("user"); // Remove user data
    setUser(null); // Update UI
    navigate("/login"); // Redirect to login page
  };

  return (
    <nav className="bg-[#24221b] p-4 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo / Title */}
        <h1 className="text-2xl font-bold">🎮 DAQ HiveGames</h1>

        {/* Navigation Links */}
        <div className="space-x-6 flex items-center">
          <Link to="/" className="hover:text-yellow-400">🏠 Accueil</Link>

          {/* Show Login/Register if NOT logged in */}
          {!user ? (
            <>
              <Link to="/login">
                <button className="bg-[#42320e] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                  🔑 Connexion
                </button>
              </Link>
              <Link to="/register">
                <button className="bg-[#284119] hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition">
                  📝 Inscription
                </button>
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm font-bold">👤 {user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded transition"
              >
                🔴 Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
