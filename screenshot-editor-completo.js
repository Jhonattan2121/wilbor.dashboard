const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3003/dashboard');
  await page.waitForTimeout(3000);
  
  // Clicar no bypass dev
  await page.click('button:has-text("Dev Bypass")');
  await page.waitForTimeout(5000);
  
  // Clicar em "Criar post"
  const criarButton = await page.locator('button:has-text("Criar post")').first();
  await criarButton.waitFor({ state: 'visible', timeout: 10000 });
  await criarButton.click();
  await page.waitForTimeout(3000);
  
  // Digitar texto de exemplo no editor
  await page.fill('textarea', '# Novo Editor Markdown\n\nAgora temos um editor **muito melhor**!\n\n- Preview ao vivo\n- Syntax highlight\n- Toolbar completa\n\n```javascript\nconst exemplo = "código funciona!";\n```\n\n> Uma citação aqui\n\n**Muito** mais *fácil* de usar!');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ 
    path: process.env.HOME + '/.openclaw/workspace-freelancer-wilbor/temp/editor-completo-demo.png',
    fullPage: false
  });
  
  await browser.close();
  console.log('Screenshot do editor completo salvo!');
})();
