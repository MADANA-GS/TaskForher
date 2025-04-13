import express from "express";
import axios from "axios";
import cron from "node-cron";
import dayjs from "dayjs";
import dotenv from "dotenv";
import { getAccessToken } from "../lib/tokenManager.js";

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
    time: "23:00",
    endTime: "00:00",
    type: "rest",
    icon: "🛌",
    message: "Cuddle mode activated 🥰 Close your eyes and dream of us 💖",
  },
];

// Track the last time each task was sent (using task ID as key)
const lastSent = {};

// === Send WhatsApp Message Function ===
async function sendTaskMessage(task) {
  const token = await getAccessToken();
  if (!token) {
    console.log("❌ No token available. Cannot send task:", task.title);
    return;
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
    
    // Record when this task was last sent
    lastSent[task.id] = new Date().toISOString();
    
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send: ${task.title}`,
      error?.response?.data || error.message
    );
    return false;
  }
}

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

// Helper function to check if a task should be sent now
function shouldSendTask(task) {
  // Parse the task time
  const [taskHour, taskMinute] = task.time.split(":").map(num => parseInt(num, 10));
  
  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if the current time matches the task time exactly
  return currentHour === taskHour && currentMinute === taskMinute;
}

// Helper function to check if this task was already sent today
function wasTaskSentToday(taskId) {
  if (!lastSent[taskId]) {
    return false;
  }
  
  const lastSentDate = new Date(lastSent[taskId]);
  const now = new Date();
  
  return lastSentDate.getDate() === now.getDate() && 
         lastSentDate.getMonth() === now.getMonth() && 
         lastSentDate.getFullYear() === now.getFullYear();
}

// Reset the lastSent record at midnight
function scheduleResetForMidnight() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0, 0, 0 // midnight
  );
  
  const msToMidnight = night.getTime() - now.getTime();
  
  setTimeout(() => {
    console.log("🌙 Midnight reset: Clearing lastSent record for new day");
    Object.keys(lastSent).forEach(key => {
      delete lastSent[key];
    });
    scheduleResetForMidnight(); // schedule next reset
  }, msToMidnight);
}

// Start the midnight reset scheduler
scheduleResetForMidnight();

// === Auto CRON Job: Runs Every Minute to Match Task Time ===
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  console.log(`⏳ Checking tasks at: ${formattedTime}`);

  for (const task of PREDEFINED_TASKS) {
    // Only send if this exact time matches the task time and it hasn't been sent today
    if (shouldSendTask(task) && !wasTaskSentToday(task.id)) {
      console.log(`🔔 It's time for task: ${task.id} - ${task.title} at ${formattedTime}`);
      await sendTaskMessage(task);
    }
  }
});

export default remainderRouter;