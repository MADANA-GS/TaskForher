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
    id: "wake_up",
    title: "Wake up time",
    time: "07:30",
    endTime: "08:00",
    type: "routine",
    icon: "⏰",
    message:
      "Wakey wakey, sleepy beauty 😴✨ Time to rise and shine — the world’s luckiest guy is waiting to hear your voice 💖",
  },
  {
    id: "brush_water",
    title: "Brush & Drink water",
    time: "08:00",
    endTime: "08:15",
    type: "hygiene",
    icon: "🪥💧",
    message:
      "Scrub-a-dub that perfect smile 💎 and sip some water for that glowing face I love 😍",
  },
  {
    id: "breakfast_time",
    title: "Lunch Breakfast & Drink water",
    time: "08:16",
    endTime: "08:45",
    type: "nutrition",
    icon: "🥣💧",
    message:
      "Breakfast fit for a queen 👑 Keep that belly happy, babe — you make even cereal look sexy 😘",
  },
  {
    id: "morning_talk",
    title: "10-min Morning Talk with Me 💕",
    time: "08:45",
    endTime: "08:55",
    type: "love",
    icon: "📞💖",
    message:
      "Just 10 minutes of your voice = full battery for my heart 💗 Let's smile into the day together 😘",
  },
  {
    id: "water_9am",
    title: "Drink water",
    time: "09:00",
    endTime: "09:30",
    type: "hydration",
    icon: "💦",
    message: "Hydration = hotness boost 🔥 Drink up, sexy soul 💧😘",
  },
  {
    id: "get_ready",
    title: "Get ready & Drink water",
    time: "09:30",
    endTime: "09:50",
    type: "routine",
    icon: "💄💧",
    message:
      "Slay the day, my gorgeous girl 😍💃 You're the main character and water is your potion!",
  },
  {
    id: "class_time",
    title: "Class & Drink water",
    time: "10:00",
    endTime: "10:15",
    type: "learning",
    icon: "🎓💧",
    message: "Study like a queen 👸 and sip like a diva 💧🔥",
  },
  {
    id: "water_11am",
    title: "Drink water",
    time: "11:00",
    endTime: "11:15",
    type: "hydration",
    icon: "🥤",
    message: "One more sip for the prettiest lips 😘💋",
  },
  {
    id: "water_12pm",
    title: "Drink water",
    time: "12:00",
    endTime: "12:15",
    type: "hydration",
    icon: "🚰",
    message: "Keep glowing, sunshine 🌞 Water = extra sparkle ✨",
  },
  {
    id: "lunch_time",
    title: "Drink water & Lunch",
    time: "13:00",
    endTime: "13:30",
    type: "nutrition",
    icon: "🍱💧",
    message: "Eat well, my hot angel 😇 That smile needs fuel 😍",
  },
  {
    id: "water_2pm",
    title: "Drink water",
    time: "14:00",
    endTime: "14:15",
    type: "hydration",
    icon: "🧃",
    message: "Sip, slay, sparkle 💖 That’s my hydrated queen 👑",
  },
  {
    id: "water_3pm",
    title: "Drink water",
    time: "15:00",
    endTime: "15:15",
    type: "hydration",
    icon: "💧",
    message: "More water, more cuteness overload 💕",
  },
  {
    id: "study_4pm",
    title: "Study",
    time: "16:00",
    endTime: "16:45",
    type: "learning",
    icon: "📖",
    message: "Focus time, smarty pants 😘 You + books = power couple 🧠💖",
  },
  {
    id: "snack_break",
    title: "Healthy Snack Break 🍎",
    time: "16:30",
    endTime: "16:45",
    type: "nutrition",
    icon: "🍏🥜",
    message:
      "Snack time, sugar pie 😋 Fuel that brilliant brain with a bite of yummy goodness 💪💕",
  },
  {
    id: "study_5pm",
    title: "Study",
    time: "17:00",
    endTime: "17:15",
    type: "learning",
    icon: "📘",
    message: "Short and sweet like you 😍 Let’s hit those goals!",
  },
  {
    id: "churu_love",
    title: "Talk one hour with your handsome boyfriend 😁😁",
    time: "18:00",
    endTime: "19:00",
    type: "love",
    icon: "💗",
    message:
      "Your hot man is ready for our love chat 😘 You + Me = fireworks 💥💞",
  },
  {
    id: "water_evening",
    title: "Drink water in the evening",
    time: "19:00",
    endTime: "19:15",
    type: "hydration",
    icon: "🫗",
    message:
      "Evening glow booster 🌅 Sip and shine like the goddess you are ✨",
  },
  {
    id: "study_evening",
    title: "Drink water & Study",
    time: "19:00",
    endTime: "19:30",
    type: "learning",
    icon: "📚",
    message: "Time to flex that sexy brain again 🧠🔥",
  },
  {
    id: "dinner_time",
    title: "Dinner & Drink water",
    time: "19:30",
    endTime: "21:00",
    type: "nutrition",
    icon: "🍽️",
    message:
      "Dinner date with yourself 😘 You deserve flavor and love every bite 🍜💖",
  },
  {
    id: "fun_break",
    title: "5-min Fun Break with Me 💖",
    time: "20:30",
    endTime: "20:35",
    type: "love",
    icon: "🎈💑",
    message:
      "Stretch, smile, and send me a voice note 😘 Just 5 minutes to laugh with your biggest fan — me! 🥰🎧",
  },
  {
    id: "study_night",
    title: "Study",
    time: "21:00",
    endTime: "22:00",
    type: "learning",
    icon: "📖",
    message:
      "You’re slaying even at night 🌙 Studying like the queen you are 😍",
  },
  {
    id: "talk_late",
    title: "Talk",
    time: "22:00",
    endTime: "22:30",
    type: "love",
    icon: "💬",
    message:
      "Let’s end the day with sweet nothings 💕 I miss you like crazy 😘",
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