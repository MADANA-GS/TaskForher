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

// Track tasks that have been sent to avoid duplicate messages
const sentTasks = new Set();
const resetDateKey = () => dayjs().format('YYYY-MM-DD');
let currentDateKey = resetDateKey();

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
  } catch (error) {
    console.error(
      `❌ Failed to send: ${task.title}`,
      error?.response?.data || error.message
    );
  }
}

// === Manual Endpoint: Send All Tasks ===
remainderRouter.post("/send-task-reminder", async (req, res) => {
  console.log("📨 Sending all predefined task reminders...");
  for (const task of PREDEFINED_TASKS) {
    console.log(`👉 Sending: ${task.title}`);
    await sendTaskMessage(task);
  }
  res.json({ success: true, message: "All tasks sent manually." });
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

// Checks if a new day has started, resets tracking if needed
function checkAndResetDay() {
  const newDateKey = resetDateKey();
  if (newDateKey !== currentDateKey) {
    console.log("🌞 New day detected! Resetting sent tasks tracker.");
    sentTasks.clear();
    currentDateKey = newDateKey;
  }
}

// === Auto CRON Job: Runs Every Minute to Match Task Time ===
cron.schedule("* * * * *", async () => {
  try {
    // Check if it's a new day
    checkAndResetDay();
    
    const now = dayjs();
    const currentHour = now.hour();
    const currentMinute = now.minute();
    const formattedTime = now.format("HH:mm");
    
    console.log(`⏳ Checking tasks at: ${formattedTime}`);
    
    // Check for tasks that should be sent now
    for (const task of PREDEFINED_TASKS) {
      const [taskHour, taskMinute] = task.time.split(":").map(Number);
      
      // If this task's time matches the current time and hasn't been sent today
      if (taskHour === currentHour && taskMinute === currentMinute) {
        const taskKey = `${currentDateKey}-${task.id}`;
        
        // Check if we've already sent this task today
        if (!sentTasks.has(taskKey)) {
          console.log(`🔔 Sending task: ${task.title} at ${formattedTime}`);
          await sendTaskMessage(task);
          
          // Mark this task as sent for today
          sentTasks.add(taskKey);
        } else {
          console.log(`⏭️ Task already sent today: ${task.title}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
});

export default remainderRouter;