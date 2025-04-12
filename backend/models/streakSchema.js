import mongoose from "mongoose";

const streakSchema = new mongoose.Schema(
  {
    streakPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Streak = mongoose.model("Streak", streakSchema);

export default Streak;
