import { chromium } from 'playwright';

let browserInstance: any = null;

export async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
} 