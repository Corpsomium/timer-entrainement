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
    
    // Screenshot 1: Input screen
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-01-input.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-01-input.png`);
    
    // Fill in exercise data
    await page.fill('textarea', EXAMPLE_TEXT);
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-02-input-filled.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-02-input-filled.png`);
    
    // Click Analyser
    await page.click('button.btn-primary');
    await page.waitForSelector('.stats', { timeout: 3000 });
    await page.waitForTimeout(300); // Wait for transitions
    
    // Screenshot 2: Overview screen
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-03-overview.png`,
      fullPage: true,
    });
    console.log(`  ✅ ${viewport.name}-03-overview.png`);
    
    // Test rest time steppers
    const minusBtn = page.locator('.btn-stepper').first();
    await minusBtn.click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-04-rest-adjusted.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-04-rest-adjusted.png`);
    
    // Expand first exercise card
    const firstCard = page.locator('.ex-card').first();
    await firstCard.click();
    await page.waitForTimeout(300); // Wait for expand animation
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-05-card-expanded.png`,
      fullPage: true,
    });
    console.log(`  ✅ ${viewport.name}-05-card-expanded.png`);
    
    // Click on expanded image to open lightbox (if available)
    const expandedImageCount = await page.locator('.ex-expanded-image').count();
    if (expandedImageCount > 0) {
      const expandedImage = page.locator('.ex-expanded-image').first();
      await expandedImage.click();
      await page.waitForSelector('.lightbox', { timeout: 2000 });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `/opt/cursor/artifacts/${viewport.name}-06-lightbox.png`,
        fullPage: false,
      });
      console.log(`  ✅ ${viewport.name}-06-lightbox.png`);
      
      // Close lightbox with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log(`  ⏭️  ${viewport.name}-06-lightbox.png (no illustration)`);
    }
    
    // Start session
    await page.click('button.btn-primary');
    await page.waitForSelector('.hero-ex', { timeout: 3000 });
    await page.waitForTimeout(300);
    
    // Screenshot 3: Session ready phase
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-07-session-ready.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-07-session-ready.png`);
    
    // Click on dual-frame to open lightbox in session (if available)
    const dualFrameCount = await page.locator('.dual-frame').count();
    if (dualFrameCount > 0) {
      const dualFrame = page.locator('.dual-frame').first();
      await dualFrame.click();
      await page.waitForSelector('.lightbox', { timeout: 2000 });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `/opt/cursor/artifacts/${viewport.name}-08-session-lightbox.png`,
        fullPage: false,
      });
      console.log(`  ✅ ${viewport.name}-08-session-lightbox.png`);
      
      // Close lightbox
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log(`  ⏭️  ${viewport.name}-08-session-lightbox.png (no illustration)`);
    }
    
    // Complete set to go to rest
    await page.click('button.btn-primary');
    await page.waitForTimeout(500);
    
    // Screenshot 4: Rest phase
    await page.screenshot({
      path: `/opt/cursor/artifacts/${viewport.name}-09-rest-phase.png`,
      fullPage: false,
    });
    console.log(`  ✅ ${viewport.name}-09-rest-phase.png`);
    
    await context.close();
    console.log(`✨ Done with ${viewport.name}\n`);
  }
  
  await browser.close();
  console.log('🎉 All screenshots captured!');
})();
