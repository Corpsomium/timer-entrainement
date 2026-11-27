import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const root = path.resolve('docs/screenshots/equipment');
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Développé incliné : 3x12 (2x15kg)
Rowing penché : 3x12 (2x15kg)
Marches du fermier : 2x30s (2x15kg)
Planche : 2x45s`;

async function shot(page, name) {
  await page.waitForTimeout(300);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, path.join(art, `equipment-${file}`));
  console.log('saved', p1);
}

async function loadOverview(page) {
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
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).waitFor();
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  // —— Matériel 390 ——
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await loadOverview(page);
    await page.getByRole('button', { name: 'Matériel' }).click();
    await page.getByRole('heading', { name: /Matériel/ }).waitFor();
    await shot(page, '390x844-equipment');

    // Edit a plate
    await page.getByRole('button', { name: /1,25 kg/ }).click();
    await page.getByRole('heading', { name: /Modifier · Disque/ }).waitFor();
    await shot(page, '390x844-plate-edit');
    await page.close();
  }

  // —— Session ready/work with 2x15kg ——
  for (const vp of [
    { w: 390, h: 844, prefix: '390x844' },
    { w: 1280, h: 720, prefix: '1280x720' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    await loadOverview(page);
    await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
    await page.locator('.session-screen').waitFor();
    // First exercise is Développé incliné 2x15kg — ready phase
    await page.getByText('2x15kg').first().waitFor();
    await page.getByText(/Par haltère|manche/i).first().waitFor({ timeout: 5000 }).catch(() => {});
    await shot(page, `${vp.prefix}-work-2x15`);
    await page.close();
  }

  // —— Rest + Prochain loadout 390 ——
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await loadOverview(page);
    await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
    await page.locator('.session-screen').waitFor();
    // Complete first set (reps) → rest with Prochain
    await page.getByRole('button', { name: 'Série terminée' }).click();
    await page.locator('.ring-center .sub', { hasText: 'Repos' }).waitFor();
    await page.getByText('Prochain').waitFor();
    await shot(page, '390x844-rest-prochain');
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('done');
