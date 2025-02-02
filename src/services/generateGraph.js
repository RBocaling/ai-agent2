import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import FormData from "form-data";
puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const imagesFolder = path.join(__dirname, "savedImages");

// Ensure images folder exists
if (!fs.existsSync(imagesFolder)) {
  fs.mkdirSync(imagesFolder);
  console.log("Created folder: savedImages");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getIncrementedFilename = (basePath, baseName, extension) => {
  let counter = 1;
  let filename = `${baseName}-${counter}.${extension}`;
  while (fs.existsSync(path.join(basePath, filename))) {
    counter++;
    filename = `${baseName}-${counter}.${extension}`;
  }
  return path.join(basePath, filename);
};

const addIndicator = async (frame, indicatorName) => {
  console.log(`Adding ${indicatorName} Indicator...`);
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
};

const captureTradingChart = async (symbol, res) => {
  const tradingUrl = `https://app.hyperliquid.xyz/trade/${symbol}`;

  try {
    const browser = await puppeteer.launch({
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
    const screenshotPath = getIncrementedFilename(
      imagesFolder,
      `chart-${symbol}`,
      "png"
    );
    await iframeElement.screenshot({ path: screenshotPath });

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append("language", "en");
      formData.append("timezone", "Asia/Manila");
      formData.append("symbol", symbol);
      formData.append("preparedImage", fs.createReadStream(screenshotPath)); // Attach file

      // Send the request
      const response = await fetch("https://www.tradingview.com/snapshot/", {
        method: "POST",
        headers: {
          ...formData.getHeaders(), // Set proper headers
        },
        body: formData,
      });

      // Handle response
      const responseData = await response.text();
      console.log("TradingView Response:", responseData);
      return responseData;
    } catch (error) {
      console.error("Snapshot upload error:", error);
      throw new Error("Snapshot upload failed: " + error.message);
    }

    console.log(`Trading chart saved: ${screenshotPath}`);

    res.sendFile(screenshotPath);
    await browser.close();
  } catch (error) {
    console.error("Error capturing trading chart:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

app.get("/crypto-search", async (req, res) => {
  const query = req.query.query?.replace("$", "") || "bitcoin";

  try {
    console.log(`Searching CoinGecko for: ${query}`);
    const geckoUrl = `https://www.coingecko.com/en/search_v2?query=${encodeURIComponent(
      query
    )}`;
    const geckoResponse = await fetch(geckoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://www.coingecko.com/",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!geckoResponse.ok)
      throw new Error(
        `CoinGecko request failed with status: ${geckoResponse.status}`
      );
    const geckoData = await geckoResponse.json();
    const geckoCoin = geckoData.coins?.find(
      (coin) => coin.name.toLowerCase() === query.toLowerCase()
    );

    if (geckoCoin) {
      console.log(
        `Found on CoinGecko: ${geckoCoin.symbol}, searching on Hyperliquid.`
      );
      const url_response = await captureTradingChart(geckoCoin.symbol, res);
      const url = `https://www.tradingview.com/x/${url_response}`;
      console.log("test", url);
      return res.json(url);
    }

    console.log("Symbol not found on Hyperliquid. Returning null.");
    res.json(null);
  } catch (error) {
    console.error("Error in /crypto-search endpoint:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
