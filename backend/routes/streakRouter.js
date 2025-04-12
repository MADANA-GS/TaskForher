import express from "express";
import Streak from "../models/streakSchema.js";

const streakRouter = express.Router();

// ✅ Add one number to streak
streakRouter.post("/add", async (req, res) => {
  try {
    const { number } = req.body;

    if (typeof number !== "number") {
      return res.status(400).json({ error: "Please send a valid number" });
    }

    let streak = await Streak.findOne();
    if (!streak) {
      streak = await Streak.create({ streakPoints: number });
    } else {
      streak.streakPoints += number;
      await streak.save();
    }

    res.json({ success: true, streakPoints: streak.streakPoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

streakRouter.get("/", async (req, res) => {
  try {
    const streak = await Streak.findOne();
    if (!streak) {
      // Initialize if not found
      streak = await Streak.create({ streakPoints: 0 });
    }

    res.json({ success: true, streakPoints: streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
streakRouter.post("/reset", async (req, res) => {
  try {
    let streak = await Streak.findOne();
    if (!streak) {
      streak = await Streak.create({ streakPoints: 0 });
    } else {
      streak.streakPoints = 0;
      await streak.save();
    }

    res.json({ success: true, message: "Streak reset to 0", streakPoints: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default streakRouter;
