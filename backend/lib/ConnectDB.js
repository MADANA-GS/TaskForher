import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://madangsnaik:madangsnaik@cluster0.tor7wod.mongodb.net/ecomerce?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log(error);
  }
};
