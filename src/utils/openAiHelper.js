import OpenAI from "openai";
import config from "../config/server.js";
import { format } from "date-fns";

const openai = new OpenAI({
  apiKey: config.openAiApiKey, // Ensure this is correctly set
});

export const extractTicker = async (message) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Identify if the following user message contains a real and valid cryptocurrency token or ticker symbol by searching known sources like CoinGecko, Dextools, or Hyperliquid. Today’s date ${format(
            new Date(),
            "MMM d, h:mma"
          )}.

                    - Check if the mentioned token/ticker **actually exists** in known cryptocurrency databases.
                    - If a valid ticker/token is found, return only the symbol.
                    - **If no real ticker/token exists, return null.**
                    - If multiple tokens are mentioned, return the most relevant one.
                    - **Do not generate or assume a token name if none is found.**
                    - **Return only the ticker/token or null—no extra words or formatting.**
                    
                    Message: "${message}" 
                    Ticker:`,
        },
      ],
    });

    // ✅ Extract and return only the text response
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error extracting ticker:", error);
    return null;
  }
};

export const userComment = async (comment) => {
  if (!comment) return "No valid ticker found in the message.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an AI financial analyst responding to user comments on cryptocurrency and stock market posts in real-time.

        Current Time: ${format(new Date(), "MMM d, h:mma")}
        User Comment: "${comment}"  
        Generate a **short and relevant** analysis (30-40 words) based on the provided chart comment/message description. 
        Include price action, trend direction, and potential market behavior. End the response with the **current date and time** in ${format(
          new Date(),
          "MMM d, h:mma"
        )} format`,
        },
      ],
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error fetching ticker info:", error);
    return "Could not fetch important information for the given ticker.";
  }
};
