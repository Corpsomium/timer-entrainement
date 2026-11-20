import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const EXAMPLE_TEXT = `Développé couché barre: 3x8 (60kg)
Écartés haltères: 3x12 (20kg)
Dips: 3x10
Triceps poulie: 3x15 (30kg)`;

(async () => {
  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  
  for (const viewport of VIEWPORTS) {
    console.log(`📸 Testing ${viewport.name} (${viewport.width}×${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
    });
    
    const page = await context.newPage();
    await page.goto('http://localhost:5173/');
    
    // Wait for app to load
    await page.waitForSelector('textarea', { timeout: 5000 });
    
    // Fill in exercise data
    await page.fill('textarea', EXAMPLE_TEXT);
    
    // Click Analyser
    await page.click('button.btn-primary');
    await page.waitForSelector('.stats', { timeout: 3000 });
    await page.waitForTimeout(500);
    
    // Screenshot 1: Overview with rest stepper visible
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-10-overview-with-stepper.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-10-overview-with-stepper.png`);
    
    // Expand first exercise card
    const firstCard = page.locator('.ex-card').first();
    await firstCard.click();
    await page.waitForTimeout(400);
    
    // Screenshot 2: Expanded card
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-11-card-expanded.png`,
      fullPage: true,
    });
    console.log(`  ✅ ${viewport.name}-11-card-expanded.png`);
    
    // Click "Changer l'image" button
    const changeImageBtn = page.locator('.btn-change-image').first();
    await changeImageBtn.click();
    await page.waitForSelector('.image-picker-backdrop', { timeout: 2000 });
    await page.waitForTimeout(400);
    
    // Screenshot 3: Image picker open from overview
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-12-image-picker-overview.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-12-image-picker-overview.png`);
    
    // Close picker with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Start session
    await page.click('button.btn-primary');
    await page.waitForSelector('.hero-ex', { timeout: 3000 });
    await page.waitForTimeout(400);
    
    // Screenshot 4: Session ready phase
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-13-session-ready.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-13-session-ready.png`);
    
    // Click edit image button (✎) in session
    const editBtn = page.locator('.btn-edit-image').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForSelector('.image-picker-backdrop', { timeout: 2000 });
      await page.waitForTimeout(400);
      
      // Screenshot 5: Image picker open from session
      await page.screenshot({
        path: `/opt/cursor/artifacts/${viewport.name}-14-image-picker-session.png`,
        fullPage: false,
      });
      console.log(`  ✅ ${viewport.name}-14-image-picker-session.png`);
      
      // Close picker
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log(`  ⏭️  ${viewport.name}-14-image-picker-session.png (no edit button)`);
    }
    
    // Check if there's a lightbox available (dual-frame image)
    const dualFrameCount = await page.locator('.dual-frame').count();
    if (dualFrameCount > 0) {
      const dualFrame = page.locator('.dual-frame').first();
      await dualFrame.click();
      await page.waitForSelector('.lightbox', { timeout: 2000 });
      await page.waitForTimeout(300);
      
      // Screenshot 6: Lightbox
      await page.screenshot({
        path: `/opt/cursor/artifacts/${viewport.name}-15-lightbox.png`,
        fullPage: false,
      });
      console.log(`  ✅ ${viewport.name}-15-lightbox.png`);
      
      // Close lightbox
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log(`  ⏭️  ${viewport.name}-15-lightbox.png (no illustration)`);
    }
    
    // Complete set to go to rest
    await page.click('button.btn-primary');
    await page.waitForTimeout(600);
    
    // Screenshot 7: Rest phase
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-16-rest-phase.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-16-rest-phase.png`);
    
    await context.close();
    console.log(`✨ Done with ${viewport.name}\n`);
  }
  
  await browser.close();
  console.log('🎉 All screenshots captured!');
})();
