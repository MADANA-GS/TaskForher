import mongoose from "mongoose";

// MongoDB Schema for Tokens
const tokenSchema = new mongoose.Schema(
    {
      shortLivedToken: {
        type: String,
        required: true,
      },
      longLivedToken: {
        type: String,
        required: true,
      },
      shortLivedTokenExpiresAt: {
        type: Date,
        required: true,
      },
      longLivedTokenExpiresAt: {
        type: Date,
        required: true,
      },
    },
    { timestamps: true }
  );
  
  const Token = mongoose.model("Token", tokenSchema);

  export default Token