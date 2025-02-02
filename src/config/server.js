import dotenv from "dotenv";

dotenv.config();

const config = {
  port: 3006,
  openAiApiKey: process.env.OPENAI_API_KEY,
};

export default config;
