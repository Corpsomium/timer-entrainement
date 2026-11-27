import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/timer-entrainement/';
const OUT = process.argv[2] || 'before';
const root = path.resolve('docs/screenshots/exercise-block', OUT);
fs.mkdirSync(root, { recursive: true });
const art = '/opt/cursor/artifacts';

const BLOCK = `Fentes arrière : 3x10 (2x10kg)
Développé incliné : 3x12 (2x15kg)
Rowing penché : 3x12 (2x15kg)
Hip thrust : 3x15 (20kg)
Pull-apart : 3x15 (bande20) setA
Extensions mollets : 3x15 (20kg) setA
Kickback : 3x10 (7.5kg) setB
Hammer preacher curl 45° : 3x10 (10kg) setB
Bird dogs : 2x12
Marches du fermier : 3x30s (2x15kg)`;

async function shot(page, name) {
  await page.waitForTimeout(280);
  const file = `${name}.png`;
  const p1 = path.join(root, file);
  await page.screenshot({ path: p1, fullPage: false, animations: 'disabled' });
  fs.copyFileSync(p1, path.join(art, `exercise-block-${OUT}-${file}`));
  console.log('saved', p1);
}

async function assertNoHOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      doc: { sw: doc.scrollWidth, cw: doc.clientWidth },
      body: { sw: body.scrollWidth, cw: body.clientWidth },
      wrap: (() => {
        const w = document.querySelector('.wrap');
        return w ? { sw: w.scrollWidth, cw: w.clientWidth } : null;
      })(),
    };
  });
  const bad = [];
  if (overflow.doc.sw > overflow.doc.cw) bad.push(`html ${overflow.doc.sw}>${overflow.doc.cw}`);
  if (overflow.body.sw > overflow.body.cw) bad.push(`body ${overflow.body.sw}>${overflow.body.cw}`);
  if (overflow.wrap && overflow.wrap.sw > overflow.wrap.cw) {
    bad.push(`.wrap ${overflow.wrap.sw}>${overflow.wrap.cw}`);
  }
  if (bad.length) {
    throw new Error(`Horizontal overflow (${label}): ${bad.join('; ')}`);
  }
  console.log('ok no h-overflow', label, overflow);
}

async function seedOverview(page) {
  await page.addInitScript(() => {
    document.startViewTransition = undefined;
    try {
      localStorage.removeItem('muscu-timer-session');
      localStorage.removeItem('muscu-timer-equipment-types');
      localStorage.removeItem('muscu-timer-equipment');
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
  for (const vp of [
    { w: 390, h: 844, prefix: '390x844' },
    { w: 1280, h: 720, prefix: '1280x720' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    await seedOverview(page);
    await shot(page, `${vp.prefix}-overview-top`);

    if (OUT === 'before') {
      const edit = page.getByRole('button', { name: 'Modifier le bloc' }).first();
      await edit.scrollIntoViewIfNeeded();
      await edit.click();
      await page.locator('#block').waitFor();
      await shot(page, `${vp.prefix}-editor`);
    } else {
      await page.getByRole('button', { name: 'Bloc', exact: true }).click();
      await page.locator('#block').waitFor();

      // Loaded session → Retour à l'aperçu must remain
      await page.getByRole('button', { name: "Retour à l'aperçu" }).waitFor();

      // Label + compact clear on one row (or wrap), button not full-bleed
      const row = await page.evaluate(() => {
        const label = document.querySelector('label[for="block"]');
        const btn = [...document.querySelectorAll('button')].find((b) =>
          b.textContent?.trim() === 'Tout vider'
        );
        if (!label || !btn) return { ok: false, reason: 'missing label/btn' };
        const lr = label.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        return {
          ok: true,
          labelText: label.textContent?.trim(),
          labelW: Math.round(lr.width),
          btnW: Math.round(br.width),
          btnLeft: Math.round(br.left),
          vw: window.innerWidth,
        };
      });
      if (!row.ok) throw new Error(`field-row missing (${vp.prefix})`);
      if (row.labelText !== 'Votre bloc') {
        throw new Error(`label text="${row.labelText}" (${vp.prefix})`);
      }
      if (row.btnW > row.vw * 0.55) {
        throw new Error(`Tout vider too wide: ${row.btnW}px on ${row.vw} (${vp.prefix})`);
      }
      console.log('ok field-row', vp.prefix, row);

      await assertNoHOverflow(page, `${vp.prefix}-editor`);
      await shot(page, `${vp.prefix}-editor`);

      await page.getByRole('button', { name: 'Tout vider' }).click();
      await page.getByRole('dialog').waitFor();
      await assertNoHOverflow(page, `${vp.prefix}-confirm`);
      await shot(page, `${vp.prefix}-confirm-clear`);

      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Tout vider' })
        .click();
      await page.locator('#block').waitFor();
      await page.waitForFunction(() => {
        const el = document.querySelector('#block');
        return el && el.value === '';
      });
      // After clear, no loaded exercises → Retour disappears
      if (await page.getByRole('button', { name: "Retour à l'aperçu" }).count()) {
        throw new Error(`Retour still visible after clear (${vp.prefix})`);
      }
      await assertNoHOverflow(page, `${vp.prefix}-empty`);
      await shot(page, `${vp.prefix}-empty`);
    }

    await page.close();
  }
} finally {
  await browser.close();
}
