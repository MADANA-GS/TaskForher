import React, { useEffect, useState } from "react";
import axios from "axios";
import emailjs from "emailjs-com";

// Global API URL
const API_BASE = "https://taskforher.onrender.com";

const Navbar = () => {
  const [streakPoints, setStreakPoints] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [heartBeating, setHeartBeating] = useState(false);

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/streak`);
      // Extract streak points from the correct data structure
      if (res.data.success && res.data.streakPoints) {
        setStreakPoints(res.data.streakPoints.streakPoints);
      } else {
        setStreakPoints(0);
      }
    } catch (err) {
      console.error("Failed to fetch streak:", err.message);
      setStreakPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    if (streakPoints < 50) {
      setPayoutMessage("❌ You need at least 50 streak points to receive a payout.");
      return;
    }

    try {
      // 💌 Send email using your credentials
      await emailjs.send(
        "service_kpdnshd",
        "template_wt6rhst",
        {
          from_name: "Your Girlfriend 💕",
          message: `Hey Madan! I just clicked payout with ${streakPoints} points. Time to pay me 😏`,
          to_email: "madangsnayak@gmail.com"
        },
        "Rpu0wwDRRW_8f47N7"
      );

      // 🔁 Reset streak on backend
      await axios.post(`${API_BASE}/api/streak/reset`);

      setPayoutMessage(`✅ ₹${streakPoints} will be credited to your account in 2 hours 💸`);
      setStreakPoints(0);
    } catch (error) {
      setPayoutMessage("⚠️ Failed to process payout. Try again later.");
      console.error("Payout error:", error);
    }
  };

  const handleOpenPopup = () => {
    setHeartBeating(true);
    
    // Reset beating effect after animation completes
    setTimeout(() => {
      setHeartBeating(false);
      fetchStreak(); // Refresh streak points when opening the popup
      setShowPopup(true);
    }, 800);
  };

  return (
    <>
      <nav className="bg-gray-800 text-white shadow-md border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold flex items-center space-x-2">
            <span className="text-blue-400">Habit Hype</span>
          </div>

          <div
            onClick={handleOpenPopup}
            className="cursor-pointer relative flex items-center"
          >
            <div className="bg-blue-600 hover:bg-rose-500 px-4 py-2 rounded-md shadow-md transition-all duration-300 flex items-center space-x-2 transform hover:scale-105 active:scale-95">
              <span className={`text-white text-lg ${heartBeating ? 'heart-beat' : ''}`}>💗</span>
              <span className="text-white font-medium">Love</span>
            </div>
          </div>
        </div>
      </nav>

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-gray-800 text-white rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-700 animate-fadeIn mx-4">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">💸 Redeem Your Streak</h2>
            <p className="mb-3 text-gray-300">1 streak = ₹1. Minimum 50 points required for payout.</p>
            <div className="bg-gray-700 p-4 rounded-lg mb-4 flex items-center justify-center">
              <div className="text-center">
                <div className="text-rose-400 text-4xl mb-2">💗</div>
                <p className="font-medium">You currently have:</p>
                {loading ? (
                  <p className="text-gray-300 text-xl">Loading...</p>
                ) : (
                  <p className="text-rose-400 text-3xl font-bold">{streakPoints} points</p>
                )}
              </div>
            </div>

            {payoutMessage && (
              <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg mb-4 text-sm">
                {payoutMessage}
              </div>
            )}

            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={() => setShowPopup(false)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 px-5 py-2 rounded-md transition-colors font-medium flex-1"
              >
                Close
              </button>
              <button
                onClick={handlePayout}
                className={`${
                  streakPoints >= 50 
                    ? "bg-blue-700 hover:bg-blue-600" 
                    : "bg-blue-900 opacity-50 cursor-not-allowed"
                } text-gray-100 px-5 py-2 rounded-md transition-colors font-medium flex-1 shadow-md`}
                disabled={streakPoints < 50}
              >
                Payout
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .heart-beat {
          animation: heartBeat 0.8s cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.3); }
          28% { transform: scale(1); }
          42% { transform: scale(1.3); }
          70% { transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default Navbar;