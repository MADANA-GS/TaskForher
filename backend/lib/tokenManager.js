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
    console.error("❌ Email send error:", err.response?.status, err.response?.data || err.message);
  }
}

// Cache token to avoid excessive DB reads
let tokenCache = {
  token: null,
  lastFetched: null
};

// Invalidate cache after this many minutes
const CACHE_TTL_MINUTES = 5;

// === Main Token Getter ===
export async function getAccessToken() {
  // Check cache first
  if (tokenCache.token && tokenCache.lastFetched) {
    const cacheAge = (Date.now() - tokenCache.lastFetched) / (1000 * 60); // age in minutes
    if (cacheAge < CACHE_TTL_MINUTES) {
      return tokenCache.token;
    }
  }

  // Cache miss or expired, fetch from DB
  const token = await Token.findOne();

  if (token) {
    // Check if DB tokens are valid using their stored expiry times first (faster)
    const now = new Date();
    
    // Add 5 minutes buffer to avoid edge cases
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Check if long-lived token is valid with buffer
    if (token.longLivedTokenExpiresAt && token.longLivedTokenExpiresAt.getTime() > (now.getTime() + buffer)) {
      console.log(`✅ Using cached long-lived token, valid until ${token.longLivedTokenExpiresAt.toLocaleString()}`);
      // Update cache
      tokenCache.token = token.longLivedToken;
      tokenCache.lastFetched = Date.now();
      return token.longLivedToken;
    }
    
    // Check if short-lived token is valid with buffer
    if (token.shortLivedTokenExpiresAt && token.shortLivedTokenExpiresAt.getTime() > (now.getTime() + buffer)) {
      console.log(`⚠️ Long-lived token expired. Using short-lived token valid until ${token.shortLivedTokenExpiresAt.toLocaleString()}`);
      // Update cache
      tokenCache.token = token.shortLivedToken;
      tokenCache.lastFetched = Date.now();
      return token.shortLivedToken;
    }

    // If stored expiry times indicate tokens might be expiring soon, validate with Facebook
    const isLongLivedValid = await validateAccessToken(token.longLivedToken, "longLived");
    const isShortLivedValid = !isLongLivedValid ? await validateAccessToken(token.shortLivedToken, "shortLived") : false;

    if (isLongLivedValid) {
      tokenCache.token = token.longLivedToken;
      tokenCache.lastFetched = Date.now();
      return token.longLivedToken;
    }
    
    if (isShortLivedValid) {
      tokenCache.token = token.shortLivedToken;
      tokenCache.lastFetched = Date.now();
      return token.shortLivedToken;
    }

    console.log("⚠️ Both tokens invalid. Refreshing...");
    const newToken = await refreshAccessToken();
    if (!newToken) {
      const alertMsg = `Token refresh failed! Facebook API access may be down.\nTime: ${new Date().toLocaleString()}`;
      console.error("❌", alertMsg);
      await sendAlertEmail(alertMsg);
      return null;
    }

    // Update cache with new token
    tokenCache.token = newToken.token;
    tokenCache.lastFetched = Date.now();
    return newToken.token;
  } else {
    console.log("⚠️ No tokens in DB. Creating new tokens...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      tokenCache.token = newToken.token;
      tokenCache.lastFetched = Date.now();
    }
    return newToken ? newToken.token : null;
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

    if (!data || !data.data) {
      console.error(`❌ Invalid response from Facebook debug_token API for ${type} token`);
      return false;
    }

    // First check if token is valid according to Facebook
    if (!data.data.is_valid) {
      console.log(`🚫 ${type} Token is marked as invalid by Facebook`);
      return false;
    }

    const expiresAt = data.data.expires_at * 1000;
    const timeLeft = expiresAt - Date.now();

    // If already expired
    if (timeLeft <= 0) {
      console.log(`🕐 ${type} Token expired at:`, new Date(expiresAt).toLocaleString());
      return false;
    } 
    // If expires in less than 3 days, consider it expiring soon (only for long-lived tokens)
    else if (type === "longLived" && timeLeft < 3 * 24 * 60 * 60 * 1000) {
      console.log(`⚠️ ${type} Token expiring soon on:`, new Date(expiresAt).toLocaleString());
      // Update the expiration time in database
      await Token.updateOne(
        {},
        { [`${type}TokenExpiresAt`]: new Date(expiresAt) }
      );
      return true; // Still valid, but flagged for early refresh in next cycle
    } 
    // Otherwise token is valid
    else {
      console.log(`✅ ${type} Token valid till:`, new Date(expiresAt).toLocaleString());
      // Update the expiration time in database to ensure we have accurate data
      await Token.updateOne(
        {},
        { [`${type}TokenExpiresAt`]: new Date(expiresAt) }
      );
      return true;
    }
  } catch (err) {
    console.error(`❌ ${type} Token validation failed:`, err?.response?.data || err.message);
    return false;
  }
}

// === Token Refresh with Retry Logic ===
export async function refreshAccessToken(retryCount = 3, retryDelay = 1000) {
  // Try to use different token sources in priority order
  let tokenSources = [];
  
  // First try to get token from DB
  const token = await Token.findOne();
  
  if (token?.longLivedToken) {
    tokenSources.push({
      token: token.longLivedToken,
      name: "DB_LONG_LIVED_TOKEN",
      isLongLived: true
    });
  }
  
  if (token?.shortLivedToken) {
    tokenSources.push({
      token: token.shortLivedToken,
      name: "DB_SHORT_LIVED_TOKEN",
      isLongLived: false
    });
  }
  
  // Then try environment variables
  if (process.env.LONG_LIVED_TOKEN) {
    tokenSources.push({
      token: process.env.LONG_LIVED_TOKEN,
      name: "LONG_LIVED_TOKEN",
      isLongLived: true
    });
  }
  
  if (process.env.SHORT_LIVED_TOKEN) {
    tokenSources.push({
      token: process.env.SHORT_LIVED_TOKEN,
      name: "SHORT_LIVED_TOKEN",
      isLongLived: false
    });
  }
  
  // If no token sources available
  if (tokenSources.length === 0) {
    const msg = "❌ No valid token to use for refresh! Update your .env file.";
    console.error(msg);
    await sendAlertEmail(msg);
    return null;
  }

  // Try each token source until one works
  for (const source of tokenSources) {
    let currentRetry = 0;
    
    while (currentRetry < retryCount) {
      try {
        console.log(`🔄 Requesting new token using ${source.name} (Attempt ${currentRetry + 1}/${retryCount})...`);

        const { data } = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
          params: {
            grant_type: "fb_exchange_token",
            client_id: process.env.APP_ID,
            client_secret: process.env.APP_SECRET,
            fb_exchange_token: source.token,
          },
        });

        const newToken = data.access_token;
        
        // Get actual expiration information from Facebook
        const debugResponse = await axios.get(`https://graph.facebook.com/debug_token`, {
          params: {
            input_token: newToken,
            access_token: `${process.env.APP_ID}|${process.env.APP_SECRET}`,
          },
        });
        
        // Verify token is valid
        if (!debugResponse?.data?.data?.is_valid) {
          throw new Error("Token received from Facebook is marked as invalid");
        }
        
        // Determine token type based on expiration time and source type
        const expiresAt = debugResponse?.data?.data?.expires_at * 1000;
        const actualExpiryTime = expiresAt ? new Date(expiresAt) : null;
        
        // Check if we received a long-lived token (typically valid for 60 days)
        // or a short-lived token (typically valid for 1-2 hours)
        const tokenTtlMs = expiresAt ? (expiresAt - Date.now()) : null;
        const isLongLivedToken = tokenTtlMs ? (tokenTtlMs > 24 * 60 * 60 * 1000) : source.isLongLived;
        
        // Set default expiry times if actual ones not available
        const shortLivedExpires = actualExpiryTime || new Date(Date.now() + 30 * 60 * 1000);
        const longLivedExpires = actualExpiryTime || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        // Update DB based on token type
        if (isLongLivedToken) {
          await Token.updateOne(
            {},
            {
              longLivedToken: newToken,
              longLivedTokenExpiresAt: longLivedExpires,
            },
            { upsert: true }
          );
          console.log("🔑 Received long-lived token:", newToken.slice(0, 30) + "...");
          console.log("📅 Long-lived token expires:", longLivedExpires.toLocaleString());
          
          return { token: newToken, isLongLived: true, expiresAt: longLivedExpires };
        } else {
          await Token.updateOne(
            {},
            {
              shortLivedToken: newToken,
              shortLivedTokenExpiresAt: shortLivedExpires,
            },
            { upsert: true }
          );
          console.log("🔑 Received short-lived token:", newToken.slice(0, 30) + "...");
          console.log("📅 Short-lived token expires:", shortLivedExpires.toLocaleString());
          
          return { token: newToken, isLongLived: false, expiresAt: shortLivedExpires };
        }
      } catch (err) {
        currentRetry++;
        
        if (currentRetry >= retryCount) {
          console.error(`❌ Failed all ${retryCount} attempts to refresh token using ${source.name}:`, 
            err?.response?.data?.error?.message || err.message);
          break; // Move to next token source
        } else {
          console.warn(`⚠️ Retry ${currentRetry}/${retryCount} for ${source.name} after ${retryDelay}ms:`, 
            err?.response?.data?.error?.message || err.message);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          // Exponential backoff
          retryDelay *= 2;
        }
      }
    }
    // Current source failed after all retries, continue to next source
  }

  // If we get here, all token sources failed
  const errorMsg = `All token refresh attempts failed with all sources!\nTime: ${new Date().toLocaleString()}`;
  console.error("❌", errorMsg);
  await sendAlertEmail(errorMsg);
  return null;
}