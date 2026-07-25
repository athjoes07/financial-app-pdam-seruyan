const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:5174/');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  
  console.log('Typing in search bar...');
  await page.type('.topbar-search input', 't');
  
  // Wait a bit to catch any errors
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
  console.log('Done');
})();
