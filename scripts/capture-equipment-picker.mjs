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

/** Full kit so after shots show wrapped full-name chips when needed. */
const FULL_KIT = {
  bars: [
    { id: 'h', name: 'Manche', kind: 'haltère', weightKg: 2.5, sleeveCm: 8.3, quantity: 2 },
    { id: 'd', name: 'Barre', kind: 'barre_droite', weightKg: 20, sleeveCm: 20, quantity: 1 },
    { id: 'e', name: 'EZ', kind: 'barre_ez', weightKg: 10, sleeveCm: 15, quantity: 1 },
  ],
  plates: [
    { id: 'p1', weightKg: 1.25, quantity: 4, thicknessCm: 2 },
    { id: 'p2', weightKg: 2.5, quantity: 8, thicknessCm: 2.3 },
    { id: 'p3', weightKg: 5, quantity: 6, thicknessCm: 2.8 },
  ],
  kettlebells: [{ id: 'k', weightKg: 16, quantity: 2 }],
};

async function shot(page, name) {
  await page.waitForTimeout(280);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, path.join(art, `equip-picker-${OUT}-${file}`));
  console.log('saved', p1);
}

async function gotoReady(page, { fullKit = false } = {}) {
  await page.addInitScript(
    ({ kit, useFull }) => {
      document.startViewTransition = undefined;
      try {
        localStorage.removeItem('muscu-timer-session');
        localStorage.removeItem('muscu-timer-equipment-types');
        if (useFull) localStorage.setItem('muscu-timer-equipment', JSON.stringify(kit));
        else localStorage.removeItem('muscu-timer-equipment');
      } catch (_) {}
    },
    { kit: FULL_KIT, useFull: fullKit }
  );
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
    // After: seed full kit so all full-name chips (incl. wrap on 390) are visible
    await gotoReady(page, { fullKit: OUT === 'after' });
    await shot(page, `${vp.prefix}-exercise`);

    const picker = page.locator('.equip-picker');
    if (OUT === 'after' && (await picker.count()) > 0) {
      await shot(page, `${vp.prefix}-picker`);
      const aucun = page.getByRole('radio', { name: 'Aucun' });
      if (await aucun.count()) {
        await aucun.click();
        await page.waitForTimeout(200);
        await shot(page, `${vp.prefix}-changed`);
      } else {
        await picker.locator('button').last().click();
        await shot(page, `${vp.prefix}-changed`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
