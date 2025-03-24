import React from "react";
import { Link } from "react-router-dom";

export default function GameCard({ game }) {
  return (
    <Link to={`/game/${game.id}`} className="block">
      <div className="mr-10 relative min-w-[200px] sm:min-w-[250px] md:min-w-[300px] group overflow-hidden rounded-lg cursor-pointer transition-transform transform hover:scale-110">
        {/* Game Image */}
        <img
          src={game.image || "https://via.placeholder.com/300x170"}
          alt={game.name}
          className="w-full h-[170px] object-cover rounded-lg"
        />

        {/* Overlay Effect on Hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <h3 className="text-lg font-bold text-white">{game.name}</h3>
          <p className="text-sm text-gray-300 truncate">{game.description}</p>
        </div>
      </div>
    </Link>
  );
}
