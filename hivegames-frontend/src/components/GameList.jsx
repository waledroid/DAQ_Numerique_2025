import React from "react";
import GameCard from "./GameCard";

export default function GameList({ games }) {
  if (!games || games.length === 0) {
    return <p className="text-gray-400 text-center">No games available.</p>;
  }

  return (
    <div className="overflow-x-auto scrollbar-hide flex space-x-6 p-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
