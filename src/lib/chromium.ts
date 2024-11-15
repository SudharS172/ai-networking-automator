import puppeteer from 'puppeteer-core';
import chrome from 'chrome-aws-lambda';

let _page: any = null;

async function getPage() {
  if (_page) {
    return _page;
  }

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: true,
  });

  _page = await browser.newPage();
  return _page;
}

export { getPage }; 