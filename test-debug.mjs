import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('textarea', { timeout: 5000 });
  
  const EXAMPLE_TEXT = `Développé couché barre 3x8 60kg
Écartés haltères 3x12 20kg`;
  
  await page.fill('textarea', EXAMPLE_TEXT);
  console.log('Filled textarea');
  
  await page.screenshot({ path: '/opt/cursor/artifacts/debug-before-click.png' });
  
  const btn = await page.locator('button.btn-primary');
  console.log('Button count:', await btn.count());
  console.log('Button text:', await btn.textContent());
  
  await btn.click();
  console.log('Clicked button');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/opt/cursor/artifacts/debug-after-click.png' });
  
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  
  // Check what's visible
  const body = await page.locator('body').innerHTML();
  console.log('Body contains .stats:', body.includes('class="stats"'));
  console.log('Body contains .ex-list:', body.includes('class="ex-list"'));
  
  await page.waitForTimeout(5000);
  await browser.close();
})();
