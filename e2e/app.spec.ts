import { test, expect, type Page } from '@playwright/test';

const settings = {width:7,height:7,seed:42,g:.3,b:.15,tau:.4,generator:'dfs',controlsOpen:true,lockSize:false,solverEnabled:true,solverAlgorithm:'dfs',animationMode:'build-solve',solverStepMs:250,generationColor:'#14b8a6',generationOpacity:.35,solverColor:'#2563eb',solverOpacity:.65};
test.beforeEach(async ({page}) => {
  await page.addInitScript(value => {
    if (!localStorage.getItem('maze:settings:v1')) localStorage.setItem('maze:settings:v1', JSON.stringify(value));
  }, settings);
});

async function openControls(page: Page) {
  if (!await page.locator('#controls-panel').isVisible()) await page.getByRole('button', {name:'Show Controls',exact:true}).click();
}
async function alphaAt(page: Page, x:number, y:number) {
  return page.locator('canvas.draw-canvas').evaluate((canvas:HTMLCanvasElement, p) =>
    canvas.getContext('2d')!.getImageData(Math.round(canvas.width*p.x),Math.round(canvas.height*p.y),1,1).data[3], {x,y});
}

test('markers are escaped; malformed URLs do not crash; desktop/mobile controls toggle', async ({page}) => {
  const errors:string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./?start=%25');
  await expect(page.getByRole('heading',{name:'InfiMaze',exact:true})).toBeVisible();
  await expect(page.locator('input[type="text"]:not([name]):not([id]), select:not([name]):not([id])')).toHaveCount(0);
  await expect(page.getByLabel('Start marker',{exact:true})).toHaveValue('%');
  await page.goto('./?v=2&start=' + encodeURIComponent('</text><image onload="alert(1)"/><text>'));
  await expect(page.locator('#print-maze-only image')).toHaveCount(0);
  await expect(page.locator('#print-maze-only text').first()).toHaveText('</text><image onload="alert(1)"/><text>');
  await page.getByRole('button',{name:'Hide Controls',exact:true}).click();
  await expect(page.locator('#controls-panel')).toBeHidden();
  await expect(page.locator('.shell')).toHaveClass(/controls-closed/);
  await page.getByRole('button',{name:'Show Controls',exact:true}).click();
  await expect(page.locator('#controls-panel')).toBeVisible();
  await page.getByRole('button',{name:'Minimize',exact:true}).click();
  await expect(page.locator('#controls-panel')).toBeHidden();
  expect(errors).toEqual([]);
});

test('saved rectangular maze and markers restore despite square lock; empty markers persist', async ({page}) => {
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  await page.getByLabel(/^Height:/).fill('9');
  await page.getByLabel('Start marker',{exact:true}).fill('???????????');
  await page.getByLabel('Goal marker',{exact:true}).fill('');
  await page.getByLabel('Maze name').fill('Rectangle');
  await page.getByRole('button',{name:'Save current',exact:true}).click();
  await page.getByLabel('Lock width & height (square)').check();
  await expect(page.getByLabel(/^Height:/)).toHaveValue('7');
  await page.getByLabel('Start marker',{exact:true}).fill('X');
  await page.getByRole('button',{name:'Load',exact:true}).click();
  await expect(page.getByLabel(/^Height:/)).toHaveValue('9');
  await expect(page.getByLabel('Lock width & height (square)')).not.toBeChecked();
  await expect(page.getByLabel('Start marker',{exact:true})).toHaveValue('???????????');
  await expect(page.getByLabel('Goal marker',{exact:true})).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('Start marker',{exact:true})).toHaveValue('???????????');
  await expect(page.getByLabel('Goal marker',{exact:true})).toHaveValue('');
  await expect(page.getByRole('button',{name:'Load',exact:true})).toBeVisible();
});

test('shape selector changes the maze mask', async ({page}) => {
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  const shape=page.getByLabel('Maze shape');
  await expect(shape).toHaveValue('rectangle');
  const rectangularWalls=await page.locator('#print-maze-only .walls').innerHTML();
  await shape.selectOption('heart');
  await expect(shape).toHaveValue('heart');
  await expect.poll(()=>page.locator('#print-maze-only .walls').innerHTML()).not.toBe(rectangularWalls);
});

test('custom silhouette upload exposes preview controls and builds a maze',async({page})=>{
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  await page.getByLabel('Maze shape').selectOption('custom');
  await page.getByLabel('Silhouette image').setInputFiles('public/silhouettes/brain.png');
  await expect(page.getByLabel('Custom mask preview')).toBeVisible();
  await expect(page.getByText(/brain\.png.*\d+ active cells/)).toBeVisible();
  await page.getByLabel(/Threshold:/).fill('120');
  await page.getByLabel('Invert light and dark').check();
  await expect(page.locator('#print-maze-only')).toBeVisible();
});

test('endpoints can be placed on cells and restored automatically',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:'Set start',exact:true}).click();
  await expect(page.getByRole('grid',{name:'Choose start cell'})).toBeVisible();
  await page.getByRole('gridcell',{name:'Set start at column 2, row 2'}).click();
  await expect(page.getByText(/Start: 2,2/)).toBeVisible();
  await page.getByRole('button',{name:'Set goal',exact:true}).click();
  await page.getByRole('gridcell',{name:'Set goal at column 6, row 6'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Goal: 6,6/)).toBeVisible();
  await page.getByLabel('Automatic endpoint placement').selectOption('farthest');
  await expect(page.getByLabel('Automatic endpoint placement')).toHaveValue('');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(page.getByText(/Start: 1,4.*Goal: 7,4/)).toBeVisible();
});

test('wall styles update rendered and printable maze appearance',async({page})=>{
  await page.goto('./');
  const style=page.locator('select[name="wall-style"]');
  await expect(style).toHaveValue('classic');
  await style.selectOption('rounded');
  await page.getByLabel(/Wall thickness:/).fill('6');
  await page.getByLabel(/Corner radius:/).fill('45');
  await expect(page.locator('#print-maze-only .walls-rounded path').first()).toBeVisible();
  await expect(page.locator('#print-maze-only .walls-rounded')).toHaveAttribute('stroke-width','6');
  await style.selectOption('organic');
  await expect(page.locator('#print-maze-only #organic-wall-filter')).toHaveCount(1);
  await page.reload();
  await expect(style).toHaveValue('organic');
  await expect(page.getByLabel(/Wall thickness:/)).toHaveValue('6');
});

test('gameplay moves through passages and restores progress paused',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  const game=page.getByRole('application',{name:'Maze gameplay area'});
  await expect(game).toBeFocused();
  await game.getByRole('button').first().click();
  await expect(page.getByText('Moves').locator('..')).toContainText('1');
  await game.getByRole('button',{name:'Move to column 1, row 4'}).click();
  await expect(page.getByText('Revisits').locator('..')).toContainText('1');
  await page.locator('.game-controls').getByRole('button',{name:'Pause',exact:true}).click();
  await page.reload();
  await expect(page.getByText('Paused',{exact:true})).toBeVisible();
  await expect(page.getByText('Moves').locator('..')).toContainText('2');
});

test('storage failure does not pretend to save a maze', async ({page}) => {
  await page.goto('./');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if (key === 'savedMazes:v1') throw new DOMException('Full','QuotaExceededError');
      original.call(this,key,value);
    };
  });
  await page.getByRole('button',{name:'Save current',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Could not update saved mazes');
  await expect(page.getByText('No saved mazes yet.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Load',exact:true})).toHaveCount(0);
});

test('drawing survives resizing, erases, clears and resets for a new maze', async ({page}, testInfo) => {
  await page.goto('./');
  const canvas = page.locator('canvas.draw-canvas');
  await expect(canvas).toBeVisible();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x+bounds.width*.25,bounds.y+bounds.height*.3);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height*.3,{steps:15});
  await page.mouse.up();
  await expect.poll(() => alphaAt(page,.4,.3)).toBeGreaterThan(0);
  const current = page.viewportSize()!;
  await page.setViewportSize({width:current.width-40,height:current.height});
  await expect.poll(() => alphaAt(page,.4,.3)).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('maze-drawing.png'),fullPage:true});
  await page.getByRole('button',{name:'Erase',exact:true}).click();
  const next = (await canvas.boundingBox())!;
  await page.mouse.click(next.x+next.width*.4,next.y+next.height*.3);
  await expect.poll(() => alphaAt(page,.4,.3)).toBe(0);
  await page.getByRole('button',{name:'Draw',exact:true}).click();
  await page.mouse.click(next.x+next.width*.4,next.y+next.height*.3);
  await expect.poll(() => alphaAt(page,.4,.3)).toBeGreaterThan(0);
  await page.getByRole('group',{name:'Drawing tools'}).getByRole('button',{name:'Clear',exact:true}).click();
  await expect.poll(() => alphaAt(page,.4,.3)).toBe(0);
  await page.mouse.click(next.x+next.width*.4,next.y+next.height*.3);
  await expect.poll(() => alphaAt(page,.4,.3)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Generate new maze',exact:true}).click();
  await expect.poll(() => alphaAt(page,.4,.3)).toBe(0);
  await page.getByRole('button',{name:'Scroll',exact:true}).click();
  await expect(canvas).toHaveCSS('pointer-events','none');
});

test('emoji picker stays in viewport and returns focus after Escape', async ({page}, testInfo) => {
  await page.goto('./');
  const trigger = page.getByRole('button',{name:'Pick emoji',exact:true}).first();
  await trigger.click();
  const picker = page.getByRole('dialog',{name:'Emoji picker'});
  await expect(picker).toBeVisible();
  await expect(picker.locator('em-emoji-picker')).toBeVisible();
  const bounds = (await picker.boundingBox())!, viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({path:testInfo.outputPath('emoji-picker.png')});
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('animation independently switches generation and solving algorithms', async ({page}) => {
  await page.goto('./');
  await expect(page.getByText('Animation Algorithms',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Animation mode')).toHaveValue('build-solve');
  const generator=page.getByLabel('Generation algorithm');
  const solver=page.getByLabel('Solving algorithm');
  await expect(generator).toHaveValue('dfs');
  await expect(generator.locator('option')).toHaveText(['Randomized DFS','Randomized Prim','Randomized Kruskal']);
  await expect(solver).toHaveValue('dfs');
  await expect(solver.locator('option')).toHaveText(['DFS','BFS','Dijkstra','A*']);
  await expect(page.locator('.generation-overlay-svg')).toBeVisible();
  const animationControls=page.getByRole('group',{name:'Animation playback controls'});
  await animationControls.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('button',{name:'Step',exact:true}).click();
  await expect(page.getByText(/^Building.*[1-9]/)).toBeVisible();
  await page.getByLabel('Build animation color').fill('#7c3aed');
  await page.getByLabel('Build animation opacity').fill('70');
  await expect(page.locator('.generation-overlay-svg path').first()).toHaveAttribute('stroke','#7c3aed');
  await expect(page.locator('.generation-overlay-svg path').first()).toHaveAttribute('opacity','0.7');
  const originalMaze=await page.locator('#print-maze-only .walls').innerHTML();
  await generator.selectOption('prim');
  await expect.poll(()=>page.locator('#print-maze-only .walls').innerHTML()).not.toBe(originalMaze);
  await solver.selectOption('astar');
  await expect(page.getByText(/Manhattan distance/)).toBeVisible();
  await expect(page.getByText(/^Path$/).locator('..')).toContainText('steps');
  await animationControls.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(animationControls.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Generate new maze',exact:true}).click();
  await expect(page.locator('.generation-overlay-svg')).toBeVisible();
  await page.getByLabel('Show animation overlay').uncheck();
  await expect(page.locator('.generation-overlay-svg')).toHaveCount(0);
  await page.getByLabel('Show animation overlay').check();
  await expect(page.locator('.generation-overlay-svg')).toBeVisible();
  await page.getByLabel('Animation mode').selectOption('solve');
  await expect(generator).toBeDisabled();
  await expect(solver).toBeEnabled();
  await expect(page.locator('.generation-overlay-svg')).toHaveCount(0);
  await expect(page.locator('.solver-overlay-svg')).toBeVisible();
  await page.getByLabel('Solver animation color').fill('#c026d3');
  await page.getByLabel('Solver animation opacity').fill('80');
  await expect(page.locator('.solver-expanded circle').first()).toHaveAttribute('fill','#c026d3');
  await expect(page.locator('.solver-expanded circle').first()).toHaveAttribute('opacity','0.8');
});

test('difficulty search preserves the seed', async ({page}) => {
  await page.goto('./');
  await openControls(page);
  await page.getByText('Adjust difficulty',{exact:true}).click();
  const seed = await page.locator('header').innerText();
  await page.getByRole('button',{name:'Max difficulty',exact:true}).click();
  await expect(page.getByRole('button',{name:'Max difficulty',exact:true})).toBeEnabled();
  expect(await page.locator('header').innerText()).toBe(seed);
});

test('raster upload works and SVG upload is rejected', async ({page}) => {
  await page.goto('./');
  const input = page.getByLabel('Or upload custom image (start):');
  await input.setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});
  await expect(page.getByRole('alert')).toContainText('Choose a PNG');
  await input.setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#print-maze-only image')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#print-maze-only image')).toHaveCount(1);
  await page.getByRole('button',{name:'Clear start marker'}).click();
  await expect(page.locator('#print-maze-only image')).toHaveCount(0);
});

test('production service worker supports offline reload, picker and difficulty worker', async ({page,context}) => {
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:'InfiMaze',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pick emoji',exact:true}).first().click();
  await expect(page.locator('em-emoji-picker')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByText('Adjust difficulty',{exact:true}).click();
  await page.getByRole('button',{name:'Max difficulty',exact:true}).click();
  await expect(page.getByRole('button',{name:'Max difficulty',exact:true})).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await context.setOffline(false);
});

test('printing invokes the browser once and excludes drawings from paper output', async ({page}) => {
  await page.addInitScript(() => {
    window.print = () => {
      const main = window.top as Window & { printCount?:number; printedMarkup?:string };
      main.printCount = (main.printCount ?? 0) + 1;
      main.printedMarkup = document.body.innerHTML;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.goto('./');
  await page.getByRole('button',{name:'Print maze',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as Window & {printCount?:number}).printCount)).toBe(1);
  await expect(page.locator('iframe[title="Maze print preview"]')).toHaveCount(0);
  const markup = await page.evaluate(() => (window as Window & {printedMarkup?:string}).printedMarkup);
  expect(markup).toContain('<svg');
  expect(markup).not.toContain('<canvas');
  expect(markup).not.toContain('solver-overlay-svg');

  // Exercise installed/iOS-style in-page printing without opening a real dialog.
  await page.evaluate(() => Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await page.getByRole('button',{name:'Print maze',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as Window & {printCount?:number}).printCount)).toBe(2);
  await page.emulateMedia({media:'print'});
  await expect(page.locator('canvas.draw-canvas')).toBeHidden();
  await expect(page.getByRole('group',{name:'Drawing tools'})).toBeHidden();
  await expect(page.locator('#print-maze-only svg').first()).toBeVisible();
});

test('manifest and icons resolve under the configured deployment base', async ({page}) => {
  await page.goto('./');
  const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestURL = new URL(manifestPath!, page.url());
  const response = await page.request.get(manifestURL.toString());
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe(new URL(page.url()).pathname);
  expect(manifest.scope).toBe(manifest.start_url);
  for (const icon of manifest.icons) expect((await page.request.get(new URL(icon.src,manifestURL).toString())).ok()).toBe(true);
  expect(await page.evaluate(() => document.compatMode)).toBe('CSS1Compat');
});
