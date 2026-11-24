import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before';
const root = path.resolve('docs/screenshots/set-info', OUT);
const art = '/opt/cursor/artifacts';
fs.mkdirSync(root, { recursive: true });

const BLOCK = `Squat : 2x10 (60kg)
Marches du fermier : 2x30s (2x15kg)`;

async function shot(page, name) {
  await page.waitForTimeout(350);
  const p1 = path.join(root, `${name}.png`);
  const p2 = path.join(art, `${OUT}-${name}.png`);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, p2);
  console.log('saved', p1);
}

async function prepare(page) {
  await page.addInitScript(() => {
    // Disable View Transitions so screenshots are not mid-morph overlays
    document.startViewTransition = undefined;
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#block', BLOCK);
  await page.fill('#rest', '45');
  await page.getByRole('button', { name: 'Charger la séance' }).click();
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).waitFor();
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
  await page.locator('.session-screen').waitFor();
  await page.locator('.hero-ex h2').waitFor();
}

async function advanceToTimedReady(page) {
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: 'Démarrer' }).isVisible().catch(() => false)) {
      return;
    }
    const pass = page.getByRole('button', { name: 'Passer' });
    if (await pass.isVisible().catch(() => false)) {
      await pass.click();
      await page.waitForTimeout(150);
      continue;
    }
    const done = page.getByRole('button', { name: 'Série terminée' });
    if (await done.isVisible().catch(() => false)) {
      await done.click();
      await page.waitForTimeout(150);
      continue;
    }
    break;
  }
}

async function runViewport(browser, { w, h, prefix, phases }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await prepare(page);

  if (phases.includes('ready')) {
    await shot(page, `${prefix}-ready`);
  }

  await advanceToTimedReady(page);

  if (phases.includes('work')) {
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.locator('.ring-center .sub', { hasText: 'Effort' }).waitFor();
    await page.getByRole('button', { name: 'Terminer la série' }).waitFor();
    await shot(page, `${prefix}-work`);
  }

  if (phases.includes('rest')) {
    if (!(await page.locator('.ring-center .sub', { hasText: 'Effort' }).isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Démarrer' }).click();
      await page.locator('.ring-center .sub', { hasText: 'Effort' }).waitFor();
    }
    await page.getByRole('button', { name: 'Terminer la série' }).click();
    await page.locator('.next-preview').waitFor();
    await page.locator('.ring-center .sub', { hasText: 'Repos' }).waitFor();
    await shot(page, `${prefix}-rest`);
  }

  await page.close();
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  await runViewport(browser, { w: 390, h: 844, prefix: '390', phases: ['ready', 'work', 'rest'] });
  await runViewport(browser, { w: 375, h: 667, prefix: '375', phases: ['rest'] });
  await runViewport(browser, { w: 1440, h: 900, prefix: '1440', phases: ['ready', 'work', 'rest'] });
} finally {
  await browser.close();
}
