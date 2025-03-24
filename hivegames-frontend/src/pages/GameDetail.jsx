import React, { useState } from "react";
import { useParams } from "react-router-dom";

export default function GameDetail() {
  const { id } = useParams();

  // Dummy game details
  const games = [
    {
      id: 1,
      name: "CyberQuest",
      description: "A futuristic RPG adventure set in a cyberpunk world.",
      image: "https://via.placeholder.com/800x400",
      genre: "Action RPG",
      releaseDate: "2024-03-12",
      rating: "4.5/5",
    },
    {
      id: 2,
      name: "BattleZone",
      description: "A fast-paced action shooter with futuristic weapons.",
      image: "https://via.placeholder.com/800x400",
      genre: "Shooter",
      releaseDate: "2023-11-15",
      rating: "4.2/5",
    },
    {
      id: 3,
      name: "Mystic Valley",
      description: "An open-world fantasy RPG full of magic and quests.",
      image: "https://via.placeholder.com/800x400",
      genre: "Fantasy RPG",
      releaseDate: "2022-08-21",
      rating: "4.8/5",
    },
  ];

  // Find the selected game
  const game = games.find((g) => g.id === parseInt(id));

  if (!game) {
    return <div className="text-center text-white text-xl">Game not found.</div>;
  }

  // Dummy Reviews
  const [reviews, setReviews] = useState([
    { id: 1, user: "Alice", comment: "Amazing game! Loved the story.", rating: "⭐⭐⭐⭐⭐" },
    { id: 2, user: "Bob", comment: "Graphics were incredible!", rating: "⭐⭐⭐⭐" },
  ]);

  // Review Form State
  const [newReview, setNewReview] = useState({ user: "", comment: "", rating: "⭐⭐⭐" });

  // Add New Review (Stores in Local State)
  const handleAddReview = () => {
    if (!newReview.user || !newReview.comment) {
      alert("Please enter your name and a review.");
      return;
    }

    const reviewToAdd = {
      id: reviews.length + 1,
      user: newReview.user,
      comment: newReview.comment,
      rating: newReview.rating,
    };

    setReviews([...reviews, reviewToAdd]);
    setNewReview({ user: "", comment: "", rating: "⭐⭐⭐" });
  };

  return (
    <div className="p-6">
      {/* Game Banner */}
      <div className="relative w-full h-[50vh] flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${game.image})` }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative text-center z-10">
          <h1 className="text-5xl font-bold">{game.name}</h1>
          <p className="text-lg text-gray-300">{game.description}</p>
        </div>
      </div>

      {/* Game Details */}
      <div className="mt-6 p-6 bg-[#24221b] rounded-lg shadow-md text-white">
        <h2 className="text-3xl font-bold mb-4">Game Details</h2>
        <p><strong>🎮 Genre:</strong> {game.genre}</p>
        <p><strong>📅 Release Date:</strong> {game.releaseDate}</p>
        <p><strong>⭐ Rating:</strong> {game.rating}</p>
      </div>

      {/* Reviews Section */}
      <div className="mt-6 p-6 bg-[#24221b] rounded-lg shadow-md text-white">
        <h2 className="text-3xl font-bold mb-4">📝 Reviews</h2>
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-[#0a0909] p-4 rounded-lg mb-4">
              <p className="text-lg font-bold">{review.user}</p>
              <p className="text-gray-300">{review.comment}</p>
              <p className="text-yellow-400">{review.rating}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No reviews yet. Be the first to review!</p>
        )}
      </div>

      {/* Add Review Form */}
      <div className="mt-6 p-6 bg-[#24221b] rounded-lg shadow-md text-white">
        <h2 className="text-2xl font-bold mb-4">➕ Add a Review</h2>
        <input
          type="text"
          placeholder="Your Name"
          value={newReview.user}
          onChange={(e) => setNewReview({ ...newReview, user: e.target.value })}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-white"
        />
        <textarea
          placeholder="Your Review"
          value={newReview.comment}
          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-white"
        />
        <select
          value={newReview.rating}
          onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
          className="w-full p-2 mb-3 rounded bg-[#0a0909] text-white"
        >
          <option>⭐⭐⭐⭐⭐</option>
          <option>⭐⭐⭐⭐</option>
          <option>⭐⭐⭐</option>
          <option>⭐⭐</option>
          <option>⭐</option>
        </select>
        <button
          onClick={handleAddReview}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}
