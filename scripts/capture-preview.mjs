import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before';
const root = path.resolve('docs/screenshots/preview', OUT);
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Squat : 3x10 (60kg)
Développé couché : 3x8 (50kg)
Row barre : 3x10 (40kg)
Soulevé de terre : 3x5 (80kg)
Fentes marchées : 3x12 (2x12kg)
Presse à cuisses : 3x15 (120kg)
Élévations latérales : 3x12 (2x8kg)
Curl biceps : 3x12 (2x10kg)
Extensions triceps : 3x12 (25kg)
Planche : 3x45s
Crunch câble : 3x15 (30kg)
Mollets debout : 3x20 (60kg)`;

const VIEWPORTS = [
  { w: 390, h: 844, prefix: '390x844' },
  { w: 375, h: 667, prefix: '375x667' },
  { w: 1280, h: 720, prefix: '1280x720' },
];

async function shot(page, name) {
  await page.waitForTimeout(250);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, path.join(art, `preview-${OUT}-${file}`));
  console.log('saved', p1);
}

async function gotoOverview(page) {
  await page.addInitScript(() => {
    document.startViewTransition = undefined;
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#block', BLOCK);
  await page.fill('#rest', '45');
  await page.getByRole('button', { name: 'Charger la séance' }).click();
  await page.getByRole('button', { name: /Démarrer|Commencer|Reprendre/ }).waitFor();
}

async function metrics(page, label) {
  const m = await page.evaluate(() => {
    const sticky = document.querySelector('.actions-sticky, .session-sticky.actions-sticky');
    const rect = sticky?.getBoundingClientRect();
    return {
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
      stickyTop: rect ? Math.round(rect.top) : null,
      stickyBottom: rect ? Math.round(rect.bottom) : null,
      stickyHeight: rect ? Math.round(rect.height) : null,
      stickyFixed: sticky ? getComputedStyle(sticky).position : null,
      secondaryInSticky: !!document.querySelector(
        '.overview-actions .session-sticky-secondary:not([style*="display: none"])'
      ),
      secondaryFlowVisible: (() => {
        const el = document.querySelector('.overview-secondary-flow');
        if (!el) return false;
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      })(),
      primaryVisible: !!document.querySelector(
        '.actions-sticky .btn-primary, .session-sticky .btn-primary'
      ),
    };
  });
  console.log(label, m);
}

async function runStart(browser, { w, h, prefix }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await gotoOverview(page);
  await shot(page, `${prefix}-start`);
  await metrics(page, `${prefix}-start`);
  await page.close();
}

async function runResume(browser, { w, h, prefix }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await gotoOverview(page);
  await page.getByRole('button', { name: /Démarrer|Commencer/ }).click();
  await page.locator('.session-screen').waitFor();
  const done = page.getByRole('button', { name: /Série terminée|Démarrer|Terminer la série/ });
  if (await done.isVisible().catch(() => false)) {
    const label = await done.textContent();
    if (label?.includes('Démarrer')) {
      await done.click();
      await page.getByRole('button', { name: 'Terminer la série' }).click();
    } else {
      await done.click();
    }
  }
  await page.getByRole('button', { name: 'Aperçu' }).click();
  await page.getByRole('button', { name: /Reprendre/ }).waitFor();
  await shot(page, `${prefix}-resume`);
  await metrics(page, `${prefix}-resume`);
  await page.close();
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const vp of VIEWPORTS) {
    await runStart(browser, vp);
  }
  // Resume state only for 390x844 as requested
  await runResume(browser, VIEWPORTS[0]);
} finally {
  await browser.close();
}
