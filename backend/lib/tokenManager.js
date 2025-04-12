import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import Token from "../models/tokenSchema.js";

dotenv.config();

// === Email Alert Setup ===
async function sendAlertEmail(message) {
  try {
    const payload = {
      service_id: "service_kpdnshd",
      template_id: "template_wt6rhst",
      user_id: "Rpu0wwDRRW_8f47N7",
      template_params: {
        from_name: "Your Girlfriend 💕",
        message,
        to_email: "madangsnayak@gmail.com",
      },
    };

    const res = await axios.post(
      "https://api.emailjs.com/api/v1.0/email/send",
      payload
    );
    console.log("📧 Email sent:", res.statusText);
  } catch (err) {
    console.error("❌ Failed to send Email:", err.response?.data || err.message);
  }
}

// === Main Token Getter ===
export async function getAccessToken() {
  const token = await Token.findOne();

  if (token) {
    const isShortLivedValid = await validateAccessToken(token.shortLivedToken, "shortLived");
    const isLongLivedValid = await validateAccessToken(token.longLivedToken, "longLived");

    if (isLongLivedValid) return token.longLivedToken;
    if (isShortLivedValid) {
      console.log("⚠️ Long-lived token expired. Using short-lived token.");
      return token.shortLivedToken;
    }

    console.log("⚠️ Both tokens invalid. Trying to refresh...");
    const newToken = await refreshAccessToken();
    if (!newToken) {
      const alertMsg = `Token refresh failed! Facebook API access may be down.\nTime: ${new Date().toLocaleString()}`;
      console.error("❌", alertMsg);
      await sendAlertEmail(alertMsg);
      return null;
    }

    return newToken;
  } else {
    console.log("⚠️ No tokens in DB. Attempting to create new tokens...");
    return await refreshAccessToken();
  }
}

// === Token Validation ===
async function validateAccessToken(token, type) {
  if (!token) return false;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: token,
        access_token: `${process.env.APP_ID}|${process.env.APP_SECRET}`,
      },
    });

    const expiresAt = data.data.expires_at * 1000;
    const timeLeft = expiresAt - Date.now();

    if (timeLeft <= 0) {
      console.log(`🕐 ${type} Token expired at:`, new Date(expiresAt).toLocaleString());
      return false;
    } else if (timeLeft < 3 * 24 * 60 * 60 * 1000) {
      console.log(`⚠️ ${type} Token expiring soon on:`, new Date(expiresAt).toLocaleString());
      return false; // Early refresh
    } else {
      console.log(`✅ ${type} Token valid till:`, new Date(expiresAt).toLocaleString());
      return true;
    }
  } catch (err) {
    console.error(`❌ ${type} Token validation failed:`, err?.response?.data || err.message);
    return false;
  }
}

// === Token Refresh ===
export async function refreshAccessToken() {
  const token = await Token.findOne();
  let tokenToUse = token?.shortLivedToken || process.env.SHORT_LIVED_TOKEN;

  if (!tokenToUse) {
    console.warn("⚠️ SHORT_LIVED_TOKEN missing. Trying LONG_LIVED_TOKEN...");
    tokenToUse = token?.longLivedToken || process.env.LONG_LIVED_TOKEN;
  }

  if (!tokenToUse) {
    const msg = "❌ No valid token to use for refresh! Update your .env file.";
    console.error(msg);
    await sendAlertEmail(msg);
    return null;
  }

  try {
    console.log(
      `🔄 Requesting new long-lived token using ${
        tokenToUse === process.env.SHORT_LIVED_TOKEN ? "SHORT_LIVED_TOKEN" : "LONG_LIVED_TOKEN"
      }...`
    );

    const { data } = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: tokenToUse,
      },
    });

    const newToken = data.access_token;
    // Facebook returns expires_in value, but we're setting custom expiration times
    
    // Set short-lived token to expire in 30 minutes
    const shortLivedExpires = new Date(Date.now() + 30 * 60 * 1000);
    
    // Set long-lived token to expire in 10 hours
    const longLivedExpires = new Date(Date.now() + 10 * 60 * 60 * 1000);

    // Update existing token or create if not exists (upsert)
    await Token.updateOne(
      {},
      {
        shortLivedToken: newToken,
        longLivedToken: newToken,
        shortLivedTokenExpiresAt: shortLivedExpires,
        longLivedTokenExpiresAt: longLivedExpires,
      },
      { upsert: true }
    );

    console.log("🆕 New Access Token:", newToken.slice(0, 30) + "...");
    console.log("📅 Short-lived token expires in 30 minutes:", shortLivedExpires.toLocaleString());
    console.log("📅 Long-lived token expires in 10 hours:", longLivedExpires.toLocaleString());
    
    return newToken;
  } catch (err) {
    const errorMsg = `Token refresh failed!\nError: ${
      err?.response?.data?.error?.message || err.message
    }\nTime: ${new Date().toLocaleString()}`;
    console.error("❌", errorMsg);
    await sendAlertEmail(errorMsg);
    return null;
  }
}