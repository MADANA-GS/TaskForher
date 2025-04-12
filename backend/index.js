import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./lib/ConnectDB.js";
import taskRouter from "./routes/Task.js";
import "./tokenRefresher.js";
import remainderRouter from "./routes/taskReminder.js";
import streakRouter from "./routes/streakRouter.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin:"*",
    credentials:true
}));
app.use(express.json());

// Routes
app.use("/api/tasks", taskRouter);
app.use("/api/tasks", remainderRouter);
app.use("/api/streak", streakRouter);
// MongoDB Connection
app.listen(PORT, () => {
    connectDB();
    console.log(`Server running on port http://localhost:${PORT}`);
});