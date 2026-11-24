import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before';
const root = path.resolve('docs/screenshots/layout2', OUT);
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Squat : 2x10 (60kg)
Marches du fermier : 2x30s (2x15kg)`;

const VIEWPORTS = [
  { w: 1024, h: 789, prefix: '1024x789', phases: ['work', 'rest'] },
  { w: 1280, h: 720, prefix: '1280x720', phases: ['work', 'rest'] },
  { w: 390, h: 844, prefix: '390x844', phases: ['rest'] },
];

async function shot(page, name) {
  await page.waitForTimeout(250);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  fs.copyFileSync(
    (await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' }), p1),
    path.join(art, `layout2-${OUT}-${file}`)
  );
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
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
  await page.locator('.session-screen').waitFor();
}

async function toTimedWork(page) {
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: 'Démarrer' }).isVisible().catch(() => false)) break;
    const pass = page.getByRole('button', { name: 'Passer' });
    if (await pass.isVisible().catch(() => false)) {
      await pass.click();
      continue;
    }
    const done = page.getByRole('button', { name: 'Série terminée' });
    if (await done.isVisible().catch(() => false)) {
      await done.click();
      continue;
    }
    break;
  }
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.locator('.ring-center .sub', { hasText: 'Effort' }).waitFor();
}

async function runViewport(browser, { w, h, prefix, phases }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await prepare(page);
  await toTimedWork(page);
  if (phases.includes('work')) await shot(page, `${prefix}-work`);
  if (phases.includes('rest')) {
    await page.getByRole('button', { name: 'Terminer la série' }).click();
    await page.locator('.ring-center .sub', { hasText: 'Repos' }).waitFor();
    await shot(page, `${prefix}-rest`);
  }
  const metrics = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
  }));
  console.log(prefix, metrics, 'overflow', metrics.scrollH > metrics.clientH + 1);
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
