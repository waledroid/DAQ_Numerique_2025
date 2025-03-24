import React, { useState } from "react";
import GameList from "../components/GameList";
import defaultBanner from "../assets/g.png"; // Import the default image

export default function HomePage() {
  // Dummy game data
  const [games] = useState([
    {
      id: 1,
      name: "CyberQuest",
      description: "A futuristic RPG adventure",
      image: defaultBanner,
    },
    {
      id: 2,
      name: "BattleZone",
      description: "A fast-paced action shooter",
      image: "https://via.placeholder.com/300x170",
    },
    {
      id: 3,
      name: "Mystic Valley",
      description: "An open-world fantasy RPG",
      image: "https://via.placeholder.com/300x170",
    },
    {
      id: 4,
      name: "Space Odyssey",
      description: "Explore deep space in this sci-fi adventure",
      image: "https://via.placeholder.com/300x170",
    },
    {
      id: 5,
      name: "Space Dysney",
      description: "Explore life in this sci-fi adventure",
      image: "https://via.placeholder.com/300x170",
    },
  ]);

  // Use the first game's image if available, otherwise use the default image
  const heroImage = games.length > 0 ? games[0].image : defaultBanner;

  return (
    <div className="bg-[#24221b] min-h-screen text-white">
      {/* Hero Section with Cinematic Panning Animation */}
      <div className="relative w-full h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 animate-pan"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Hero Content */}
        <div className="relative text-center z-10">
          <h1 className="text-5xl font-bold">
            {games.length > 0 ? games[0].name : "Welcome to HiveGames"}
          </h1>
          <p className="text-lg text-gray-300">
            {games.length > 0 ? games[0].description : "Discover and review your favorite games!"}
          </p>
          <button className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition">
            🎮 Jouer Maintenant
          </button>
        </div>
      </div>

      {/* Trending Games Section */}
      <div className="p-6">
        <h2 className="mb-10 text-3xl font-bold mb-4">🔥 Jeux Tendance</h2>
        <GameList games={games} />
      </div>
    </div>
  );
}
