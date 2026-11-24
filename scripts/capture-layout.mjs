import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before'; // before | after
const root = path.resolve('docs/screenshots/layout', OUT);
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Squat : 2x10 (60kg)
Marches du fermier : 2x30s (2x15kg)`;

const VIEWPORTS = [
  { w: 1024, h: 608, prefix: '1024x608', phases: ['ready', 'work', 'rest'] },
  { w: 1280, h: 720, prefix: '1280x720', phases: ['ready', 'work', 'rest'] },
  { w: 390, h: 844, prefix: '390x844', phases: ['ready', 'work', 'rest'] },
  { w: 375, h: 667, prefix: '375x667', phases: ['ready', 'work', 'rest'] },
];

async function shot(page, name) {
  await page.waitForTimeout(250);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  const p2 = path.join(art, `layout-${OUT}-${file}`);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, p2);
  console.log('saved', p1);
}

async function prepare(page) {
  await page.addInitScript(() => {
    document.startViewTransition = undefined;
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#block', BLOCK);
  await page.fill('#rest', '45');
  await page.getByRole('button', { name: 'Charger la séance' }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.locator('.session-screen').waitFor();
  await page.locator('.hero-ex h2').waitFor();
}

async function toTimedReady(page) {
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: 'Démarrer' }).isVisible().catch(() => false)) return;
    const pass = page.getByRole('button', { name: 'Passer' });
    if (await pass.isVisible().catch(() => false)) {
      await pass.click();
      await page.waitForTimeout(100);
      continue;
    }
    const done = page.getByRole('button', { name: 'Série terminée' });
    if (await done.isVisible().catch(() => false)) {
      await done.click();
      await page.waitForTimeout(100);
      continue;
    }
    break;
  }
}

async function runViewport(browser, { w, h, prefix, phases }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await prepare(page);
  if (phases.includes('ready')) await shot(page, `${prefix}-ready`);
  await toTimedReady(page);
  if (phases.includes('work')) {
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.locator('.ring-center .sub', { hasText: 'Effort' }).waitFor();
    await shot(page, `${prefix}-work`);
  }
  if (phases.includes('rest')) {
    if (!(await page.locator('.ring-center .sub', { hasText: 'Effort' }).isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Démarrer' }).click();
      await page.locator('.ring-center .sub', { hasText: 'Effort' }).waitFor();
    }
    await page.getByRole('button', { name: 'Terminer la série' }).click();
    await page.locator('.ring-center .sub', { hasText: 'Repos' }).waitFor();
    await shot(page, `${prefix}-rest`);
  }
  // scroll metrics
  const metrics = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    bodyScroll: document.body.scrollHeight,
    sessionH: document.querySelector('.session-screen')?.getBoundingClientRect().height,
  }));
  console.log(prefix, 'metrics', metrics, 'overflow', metrics.scrollH > metrics.clientH + 2);
  await page.close();
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const vp of VIEWPORTS) await runViewport(browser, vp);
} finally {
  await browser.close();
}
