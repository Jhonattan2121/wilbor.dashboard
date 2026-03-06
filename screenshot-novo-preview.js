const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3009/dashboard');
  await page.waitForTimeout(3000);
  
  // Clicar no bypass dev
  await page.click('button:has-text("Dev Bypass")');
  await page.waitForTimeout(3000);
  
  // Clicar em "Criar post"
  await page.click('button:has-text("Criar post")');
  await page.waitForTimeout(2000);
  
  // Digitar texto de exemplo
  await page.fill('textarea', `# EXPOSIÇÕES / EXIBIÇÕES

## MULTIVERSO COLABORATIVO
07/05/2022

Instalação "Rap do Surfista" — IMAGINÁRIO PERIFÉRICO, 20 anos
Centro Cultural Capiberibe 27 – Santo Cristo, Rio de Janeiro – RJ

## ARQUIVO PANDEMIA
21/03/2021

**Diários íntimos**, *recortes poéticos* e artísticos do isolamento
Universidade Federal de Minas Gerais – Editora UFMG`);
  
  await page.waitForTimeout(1500);
  
  await page.screenshot({ 
    path: process.env.HOME + '/.openclaw/workspace-freelancer-wilbor/temp/preview-funcionando.png',
    fullPage: false
  });
  
  await browser.close();
  console.log('Screenshot do novo preview salvo!');
})();
