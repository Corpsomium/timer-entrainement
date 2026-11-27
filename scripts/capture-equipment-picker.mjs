import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before';
const root = path.resolve('docs/screenshots/equipment-picker', OUT);
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Développé incliné : 3x12 (2x15kg)
Rowing penché : 3x12 (2x15kg)
Marches du fermier : 2x30s (2x15kg)`;

async function shot(page, name) {
  await page.waitForTimeout(280);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, path.join(art, `equip-picker-${OUT}-${file}`));
  console.log('saved', p1);
}

async function gotoReady(page) {
  await page.addInitScript(() => {
    document.startViewTransition = undefined;
    try {
      localStorage.removeItem('muscu-timer-equipment');
      localStorage.removeItem('muscu-timer-session');
      localStorage.removeItem('muscu-timer-equipment-types');
    } catch (_) {}
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#block', BLOCK);
  await page.fill('#rest', '45');
  await page.getByRole('button', { name: 'Charger la séance' }).click();
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
  await page.locator('.session-screen').waitFor();
  await page.getByText('2x15kg').first().waitFor();
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const vp of [
    { w: 390, h: 844, prefix: '390x844' },
    { w: 1280, h: 720, prefix: '1280x720' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    await gotoReady(page);
    await shot(page, `${vp.prefix}-exercise`);

    // After: change picker if present
    const picker = page.locator('.equip-picker');
    if (OUT === 'after' && (await picker.count()) > 0) {
      await shot(page, `${vp.prefix}-picker`);
      const corps = page.getByRole('radio', { name: 'Corps' });
      if (await corps.count()) {
        await corps.click();
        await page.waitForTimeout(200);
        await shot(page, `${vp.prefix}-changed`);
      } else {
        // fallback: click second chip
        await picker.locator('button').nth(1).click();
        await shot(page, `${vp.prefix}-changed`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
