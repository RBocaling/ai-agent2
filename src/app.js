import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractTicker, userComment } from "./utils/openAiHelper.js";
import {uploadLocalFileToFirestore} from './services/addListing.js'
puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const imagesFolder = path.join(__dirname, "savedImages");

// Ensure the images folder exists
if (!fs.existsSync(imagesFolder)) {
  fs.mkdirSync(imagesFolder);
  console.log("Created folder: savedImages");
}

// Utility function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate unique filename for saved images
const getUniqueFilename = (basePath, baseName, extension) => {
  let counter = 1;
  let filename;
  do {
    filename = `${baseName}-${counter}.${extension}`;
    counter++;
  } while (fs.existsSync(path.join(basePath, filename)));

  return path.join(basePath, filename);
};

// Function to add an indicator to the chart
const addIndicator = async (frame, indicatorName) => {
  console.log(`Adding ${indicatorName} Indicator...`);
  try {
    await frame.waitForSelector("input[placeholder='Search']", {
      timeout: 60000,
    });
    await frame.type("input[placeholder='Search']", indicatorName, {
      delay: 1000,
    });
    await delay(4000);

    const indicatorAdded = await frame.evaluate((indicatorName) => {
      const indicatorButton = [...document.querySelectorAll("span")].find(
        (span) => span.textContent.includes(indicatorName)
      );
      if (indicatorButton) {
        indicatorButton.click();
        return true;
      }
      return false;
    }, indicatorName);

    if (!indicatorAdded)
      throw new Error(`${indicatorName} Indicator button not found.`);

    console.log(`${indicatorName} Indicator Added.`);
    await delay(5000);
  } catch (error) {
    console.error(`Error adding ${indicatorName} indicator:`, error.message);
    throw error;
  }
};

// Function to capture the trading chart
const captureTradingChart = async (symbol) => {
  const tradingUrl = `https://app.hyperliquid.xyz/trade/${symbol}`;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(tradingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await delay(40000);

    const iframeElement = await page.waitForSelector(
      "iframe[id^='tradingview']",
      { timeout: 60000 }
    );
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error("Unable to access TradingView iframe.");

    console.log("Clicking Indicators button...");
    const indicatorsFound = await frame.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find(
        (btn) =>
          btn.textContent.includes("Indicators") ||
          btn.title.includes("Indicators")
      );
      if (button) {
        button.click();
        return true;
      }
      return false;
    });

    if (!indicatorsFound)
      throw new Error("Indicators button not found in iframe.");

    await delay(5000);
    await addIndicator(frame, "Relative Strength Index");

    console.log("Closing Indicator Menu...");
    await frame.evaluate(() => {
      const closeButton = document.querySelector("button.close-BZKENkhT");
      if (closeButton) closeButton.click();
    });

    await delay(5000);
    const screenshotPath = getUniqueFilename(
      imagesFolder,
      `chart-${symbol}`,
      "png"
    );
    await iframeElement.screenshot({ path: screenshotPath });

    console.log(`Trading chart saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    console.error("Error capturing trading chart:", error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
};

// Function to fetch data from CoinGecko
const fetchCryptoData = async (query) => {
  console.log(`Searching CoinGecko for: ${query}`);
  const geckoUrl = `https://www.coingecko.com/en/search_v2?query=${encodeURIComponent(
    query
  )}`;

  const response = await fetch(geckoUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
      Referer: "https://www.coingecko.com/",
      Accept: "application/json, text/plain, */*",
    },
  });

  if (!response.ok)
    throw new Error(`CoinGecko request failed with status: ${response.status}`);

  const data = await response.json();
  return data.coins?.find(
    (coin) => coin.name.toLowerCase() === query.toLowerCase()
  );
};

// Crypto search API endpoint
app.get("/crypto-search", async (req, res) => {
  const query = req.query.query?.replace("$", "") || "bitcoin";

  try {
    const geckoCoin = await fetchCryptoData(query);

    if (!geckoCoin) {
      console.log("Symbol not found on CoinGecko. Returning null.");
      return res.json(null);
    }

    console.log(`Found on CoinGecko: ${geckoCoin.symbol}, fetching chart...`);
    const screenshotPath = await captureTradingChart(geckoCoin.symbol);

    return res.sendFile(screenshotPath);
  } catch (error) {
    console.error("Error in /crypto-search endpoint:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/crypto-info", async (req, res) => {
  const { comment } = req.body;

  const ticker = await extractTicker(comment);
  const info = await userComment(comment);
  const geckoCoin = await fetchCryptoData(ticker);

  if (!geckoCoin) {
    console.log("Symbol not found on CoinGecko. Returning null.");
    return res.json(null);
  }

  console.log(`Found on CoinGecko: ${geckoCoin.symbol}, fetching chart...`);
  const screenshotPath = await captureTradingChart(geckoCoin.symbol);

  const imageUrl = `${req.protocol}://${req.get(
    "host"
  )}/savedImages/${screenshotPath}`;

  res.json(`${info} ${imageUrl}` );

  // return res.sendFile(screenshotPath);

  // res.json({ ticker, aiReply: info });
});



// Start the Express server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
