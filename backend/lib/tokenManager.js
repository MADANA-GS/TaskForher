import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

let cachedToken = process.env.LONG_LIVED_TOKEN || process.env.SHORT_LIVED_TOKEN;

export async function getAccessToken() {
  if (cachedToken && cachedToken.length > 0) {
    return cachedToken;
  }
  return await refreshAccessToken();
}

export async function refreshAccessToken() {
  try {
    console.log("🔄 Attempting to refresh access token...");

    const { data } = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: process.env.SHORT_LIVED_TOKEN,
      },
    });

    cachedToken = data.access_token;

    // Log partially for visibility (don't log full token in prod!)
    console.log("🆕 New Access Token (partial):", cachedToken.slice(0, 30) + "...");

    // Update .env file
    const envPath = path.resolve(".env");
    let envContent = fs.readFileSync(envPath, "utf-8");

    if (envContent.includes("LONG_LIVED_TOKEN=")) {
      envContent = envContent.replace(/LONG_LIVED_TOKEN=.*/g, `LONG_LIVED_TOKEN=${cachedToken}`);
    } else {
      envContent += `\nLONG_LIVED_TOKEN=${cachedToken}`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");

    console.log("✅ Long-lived token refreshed and saved to .env at", new Date().toLocaleTimeString());
    return cachedToken;
  } catch (err) {
    console.error("❌ Token refresh failed:", err?.response?.data || err.message);
    return null;
  }
}
