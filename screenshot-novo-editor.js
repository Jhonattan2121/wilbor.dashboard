const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3003/dashboard');
  await page.waitForTimeout(3000);
  
  // Clicar no bypass
  await page.click('button:has-text("Dev Bypass")');
  await page.waitForTimeout(3000);
  
  // Clicar em "Criar post"
  await page.click('button:has-text("Criar post")');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ 
    path: process.env.HOME + '/.openclaw/workspace-freelancer-wilbor/temp/novo-editor.png',
    fullPage: false
  });
  
  await browser.close();
  console.log('Screenshot do novo editor salvo!');
})();
