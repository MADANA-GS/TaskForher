import cron from "node-cron";
import axios from "axios";
import { refreshAccessToken } from "./lib/tokenManager.js";

// Token refresh every 40 minutes
cron.schedule("*/40 * * * *", async () => {
  await refreshAccessToken();
});

// Silent ping to keep backend alive every 1 minute (testing interval)
cron.schedule("*/1 * * * *", async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");  // JavaScript months are 0-indexed
  const formattedMonth = `${year}-${month}`;
  const url = `http://localhost:4000/api/tasks?month=${formattedMonth}`;

  try {
    const newdata = await axios.get(url);
    console.log("Cron fetching data", newdata.data); // log actual response data
  } catch (error) {
    console.error("Error fetching data:", error);
  }
});
