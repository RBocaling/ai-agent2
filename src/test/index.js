import express from "express";
import cron from "node-cron";
import { createTweets, getTweeterResult } from "./services/tweetService.js";
import generateAi from "./utils/openAiHelper.js";
import config from "./config/server.js";

const app = express();
const port = config.port;
app.use(express.json());

cron.schedule("*/3 * * * *", async () => {
  try {
    const { content } = await getTweeterResult();
    const tweet = await generateAi(content?.full_text);
    if (content && tweet) {
      const tweetResponse = await createTweets(tweet);
      console.log("Tweet Created:", {
        orig: content?.full_text,
        summarize: tweet,
        tweetResponse,
      });
    }
  } catch (error) {
    console.error("Error in automatic tweet creation:", error);
  }
});

app.post("/tweets", async (req, res) => {
  try {
    const content = await getTweeterResult();
    if (content) {
      const tweetResponse = await createTweets("mannual");
      console.log("Tweet Created:", tweetResponse);

      res.status(200).json(tweetResponse);
    }
  } catch (error) {
    console.error("Error in /tweets route:", error);
    res.status(500).json({ error: "Failed to create tweet" });
  }
});
app.get("/tweets", async (req, res) => {
  try {
    const { allTweets } = await getTweeterResult();
    return res.json(allTweets);
  } catch (error) {
    throw new Error(error);
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
