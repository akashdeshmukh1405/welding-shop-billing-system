import { chromium, firefox, webkit } from "playwright";

async function main() {
  console.log("Checking Playwright browser engines on host...");
  
  let hasChromium = false;
  let hasFirefox = false;
  let hasWebkit = false;

  try {
    const b = await chromium.launch({ headless: true });
    hasChromium = true;
    console.log("PASS: Chromium is installed and working.");
    await b.close();
  } catch (e: any) {
    console.log("FAIL: Chromium launch failed:", e.message);
  }

  try {
    const b = await firefox.launch({ headless: true });
    hasFirefox = true;
    console.log("PASS: Firefox is installed and working.");
    await b.close();
  } catch (e: any) {
    console.log("FAIL: Firefox launch failed:", e.message);
  }

  try {
    const b = await webkit.launch({ headless: true });
    hasWebkit = true;
    console.log("PASS: WebKit (Safari engine) is installed and working.");
    await b.close();
  } catch (e: any) {
    console.log("FAIL: WebKit launch failed:", e.message);
  }

  console.log(JSON.stringify({ hasChromium, hasFirefox, hasWebkit }));
}

main().catch(console.error);
