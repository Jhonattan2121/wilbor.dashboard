const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3003/dashboard');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ 
    path: process.env.HOME + '/.openclaw/workspace-freelancer-wilbor/temp/dashboard-atual.png',
    fullPage: true
  });
  
  await browser.close();
  console.log('Screenshot salvo!');
})();
