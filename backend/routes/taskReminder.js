import express from "express";
import axios from "axios";
import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import dotenv from "dotenv";
import { getAccessToken } from "../lib/tokenManager.js";

// Configure dayjs with timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Configure your local timezone here
const LOCAL_TIMEZONE = "Asia/Kolkata"; // Change this to your timezone (e.g., "Asia/Kolkata" for India)

dotenv.config();

const remainderRouter = express.Router();

const PREDEFINED_TASKS = [
  {
    id: "water_morning",
    title: "Drink water right after waking up",
    time: "07:00",
    endTime: "07:30",
    type: "hydration",
    icon: "💧",
    message: "Hey love, time to hydrate that cute body of yours 😘",
  },
  {
    id: "stretch",
    title: "Do light morning stretches",
    time: "07:30",
    endTime: "08:00",
    type: "exercise",
    icon: "🧘‍♀️",
    message: "Let's loosen up those pretty limbs 🌞 You're my yoga queen 😍",
  },
  {
    id: "breakfast",
    title: "Have a healthy breakfast",
    time: "08:00",
    endTime: "09:00",
    type: "nutrition",
    icon: "🥣",
    message: "Feed that gorgeous soul and body — you're glowing already 🌸✨",
  },
  {
    id: "churu_love",
    title: "Talk one hour with your handsome boyfriend 😁😁",
    time: "18:00",
    endTime: "19:00",
    type: "love",
    icon: "💗",
    message:
      "Let's get smarter together, baby. You're going to ace everything! 😘📖",
  },
  {
    id: "water_afternoon",
    title: "Drink a glass of water",
    time: "13:00",
    endTime: "13:15",
    type: "hydration",
    icon: "🚰",
    message: "Midday hydration reminder from your no.1 fan 😘",
  },
  {
    id: "walk",
    title: "Take a short walk",
    time: "17:30",
    endTime: "18:00",
    type: "exercise",
    icon: "🚶‍♀️",
    message: "Take those dreamy steps, queen 💃 The world deserves to see you!",
  },
  {
    id: "water_evening",
    title: "Drink water in the evening",
    time: "19:00",
    endTime: "19:15",
    type: "hydration",
    icon: "🫗",
    message:
      "One more sip for that perfect glow ✨ You're too pretty to be dehydrated 😘",
  },
  {
    id: "study",
    title: "Study for 1 hour",
    time: "19:30",
    endTime: "21:00",
    type: "learning",
    icon: "📚",
    message:
      "Let's get smarter together, baby. You're going to ace everything! 😘📖",
  },
  {
    id: "sleep_prep",
    title: "Wind down & prepare for sleep",
    time: "21:30",
    endTime: "22:00",
    type: "rest",
    icon: "🛌",
    message:
      "Wrap up the day, love 💫 You deserve all the peace and sweet dreams 💖",
  },
  {
    id: "goodnight_chinni",
    title: "Sleep with me babe",
    time: "22:30",
    endTime: "23:30",
    type: "rest",
    icon: "🛌",
    message: "Cuddle mode activated 🥰 Close your eyes and dream of us 💖",
  },
];

// Track tasks that have been sent for today
const sentTasksToday = new Set();

// Function to get today's date string
function getTodayDateString() {
  return dayjs().tz(LOCAL_TIMEZONE).format('YYYY-MM-DD');
}

// Reset tracking at midnight in the local timezone
let currentDateString = getTodayDateString();

// === Send WhatsApp Message Function ===
async function sendTaskMessage(task) {
  const token = await getAccessToken();
  if (!token) {
    console.log("❌ No token available. Cannot send task:", task.title);
    return false;
  }

  const messageData = {
    messaging_product: "whatsapp",
    to: process.env.RECIPIENT_NUMBER,
    type: "text",
    text: {
      body: `⏰ Reminder: ${task.icon} ${task.title}\n🕒 ${task.time} - ${
        task.endTime
      }\n💌 ${
        task.message
      }\n\n👉 Click here for your surprise gift: ${"https://task-forher.vercel.app"}`,
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Sent: ${task.title}`, response.data);
    
    // Mark this task as sent for today
    sentTasksToday.add(task.id);
    
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send: ${task.title}`,
      error?.response?.data || error.message
    );
    return false;
  }
}

// === Manual Endpoint: Send All Tasks ===
remainderRouter.post("/send-task-reminder", async (req, res) => {
  console.log("📨 Sending all predefined task reminders...");
  const results = [];
  
  for (const task of PREDEFINED_TASKS) {
    console.log(`👉 Sending: ${task.title}`);
    const success = await sendTaskMessage(task);
    results.push({ taskId: task.id, title: task.title, success });
  }
  
  res.json({ success: true, message: "All tasks sent manually.", results });
});

// === Manual Endpoint: Send Specific Task ===
remainderRouter.post("/send-specific-task", async (req, res) => {
  const { taskId } = req.body;
  
  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  const task = PREDEFINED_TASKS.find(t => t.id === taskId);
  
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const success = await sendTaskMessage(task);
  
  if (success) {
    res.json({ success: true, message: `Task "${task.title}" sent successfully.` });
  } else {
    res.status(500).json({ error: "Failed to send task message" });
  }
});

// === WhatsApp Template Message Test ===
remainderRouter.post("/send-template", async (req, res) => {
  const token = await getAccessToken();
  if (!token) {
    return res.status(401).json({ error: "No token available" });
  }

  const messageData = {
    messaging_product: "whatsapp",
    to: process.env.RECIPIENT_NUMBER,
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US",
      },
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Template message sent", response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "❌ Template message failed",
      error?.response?.data || error.message
    );
    res.status(500).json({ error: error?.response?.data || error.message });
  }
});

// Check if it's a new day and reset tracking if needed
function checkAndResetTracking() {
  const newDateString = getTodayDateString();
  
  if (newDateString !== currentDateString) {
    console.log(`🌞 New day detected! (${currentDateString} → ${newDateString}). Resetting task tracking.`);
    sentTasksToday.clear();
    currentDateString = newDateString;
  }
}

// === Auto CRON Job: Runs Every Minute to Match Task Time ===
cron.schedule("* * * * *", async () => {
  try {
    // First check if we need to reset for a new day
    checkAndResetTracking();
    
    // Get current time in the correct timezone
    const now = dayjs().tz(LOCAL_TIMEZONE);
    const localTime = now.format("HH:mm");
    const serverTime = dayjs().format("HH:mm");
    
    console.log(`⏳ Checking tasks at: ${localTime} (server time: ${serverTime})`);
    
    // Check each task
    for (const task of PREDEFINED_TASKS) {
      // Skip if already sent today
      if (sentTasksToday.has(task.id)) {
        continue;
      }
      
      // Check if it's time to send this task
      if (task.time === localTime) {
        console.log(`🔔 It's time for task: ${task.title} at ${localTime}`);
        await sendTaskMessage(task);
      }
    }
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
});

// Debug endpoint to show timezone information
remainderRouter.get("/debug-time", (req, res) => {
  const serverTime = new Date();
  const localTime = dayjs().tz(LOCAL_TIMEZONE);
  
  res.json({
    serverTime: serverTime.toString(),
    serverTimeRaw: serverTime.toISOString(),
    localTimezone: LOCAL_TIMEZONE,
    localTime: localTime.format(),
    localTimeFormatted: localTime.format("YYYY-MM-DD HH:mm:ss"),
    sentTasksToday: Array.from(sentTasksToday)
  });
});

export default remainderRouter;