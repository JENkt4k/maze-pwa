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
async function openControlPage(page:Page,name:'Build'|'Play'|'Robot'|'Analyze'|'Library'){
  await openControls(page);
  await page.getByRole('tab',{name,exact:true}).click();
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
  await expect(page.locator('input:not([name]):not([id]), select:not([name]):not([id]), textarea:not([name]):not([id])')).toHaveCount(0);
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

test('control pages limit the visible sidebar and persist high contrast mode',async({page})=>{
  await page.goto('./');
  await expect(page.getByRole('tab',{name:'Build',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tab',{name:'Build',exact:true})).toHaveAttribute('aria-controls',/build-controls-panel/);
  await expect(page.getByRole('tabpanel',{name:'Build',exact:true})).toBeVisible();
  await expect(page.locator('#build-controls-panel')).toBeVisible();
  await expect(page.locator('#robot-controls-panel')).toBeHidden();
  await page.getByRole('tab',{name:'Build',exact:true}).press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Play',exact:true})).toBeFocused();
  await openControlPage(page,'Robot');
  await expect(page.locator('#robot-controls-panel')).toBeVisible();
  await page.getByRole('button',{name:'Collapse all',exact:true}).click();
  await expect(page.locator('#robot-controls-panel details[open]')).toHaveCount(0);
  await page.getByLabel('High contrast').check();
  await expect(page.locator('html')).toHaveAttribute('data-contrast','high');
  await page.reload();
  await expect(page.getByLabel('High contrast')).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-contrast','high');
});

test('saved rectangular maze and markers restore despite square lock; empty markers persist', async ({page}) => {
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  await page.getByLabel(/^Height:/).fill('9');
  await page.getByLabel('Start marker',{exact:true}).fill('???????????');
  await page.getByLabel('Goal marker',{exact:true}).fill('');
  await openControlPage(page,'Library');
  await page.getByLabel('Maze name').fill('Rectangle');
  await page.getByLabel('Maze folder').fill('Favorites');
  await page.getByLabel('Maze tags').fill('rectangular, hard');
  await page.getByRole('button',{name:'Save current',exact:true}).click();
  await expect(page.getByText('Favorites · 7×9, seed 42')).toBeVisible();
  await expect(page.getByLabel('Tags for Rectangle')).toContainText('#rectangular #hard');
  await page.getByLabel('Filter by tag').selectOption('hard');
  await expect(page.getByLabel('Tags for Rectangle')).toBeVisible();
  await openControlPage(page,'Build');
  await page.getByLabel('Lock width & height (square)').check();
  await expect(page.getByLabel(/^Height:/)).toHaveValue('7');
  await page.getByLabel('Start marker',{exact:true}).fill('X');
  await openControlPage(page,'Library');
  await page.getByRole('button',{name:'Load',exact:true}).click();
  await expect(page.getByLabel(/^Height:/)).toHaveValue('9');
  await expect(page.getByLabel('Lock width & height (square)')).not.toBeChecked();
  await expect(page.getByLabel('Start marker',{exact:true})).toHaveValue('???????????');
  await expect(page.getByLabel('Goal marker',{exact:true})).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('Start marker',{exact:true})).toHaveValue('???????????');
  await expect(page.getByLabel('Goal marker',{exact:true})).toHaveValue('');
  await openControlPage(page,'Library');
  await expect(page.getByRole('button',{name:'Load',exact:true})).toBeVisible();
});

test('maze collection exports and restores a versioned JSON backup',async({page})=>{
  await page.goto('./');
  await openControlPage(page,'Library');
  const backup={kind:'infimaze-maze-collection',version:1,exportedAt:1,mazes:[{id:'imported',name:'Imported maze',folder:'Archive',tags:['practice'],createdAt:1,params:{width:7,height:9,seed:77,g:.3,b:.15,tau:.4}}]};
  await page.getByLabel('Collection backup file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await expect(page.getByRole('status').filter({hasText:'Imported 1 maze.'})).toBeVisible();
  await expect(page.getByText('Imported maze',{exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup',exact:true}).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^infimaze-collection-.*\.json$/);
});

test('selected saved mazes print as a configurable multi-maze pack',async({page})=>{
  await page.addInitScript(()=>{window.print=()=>{const main=window.top as Window&{printCount?:number;printedMarkup?:string};main.printCount=(main.printCount??0)+1;main.printedMarkup=document.body.innerHTML;window.dispatchEvent(new Event('afterprint'));};});
  await page.goto('./');
  await openControlPage(page,'Library');
  for(const name of ['First puzzle','Second puzzle']){await page.getByLabel('Maze name').fill(name);await page.getByRole('button',{name:'Save current',exact:true}).click();}
  await page.getByText('Printable pack',{exact:true}).click();
  await page.getByRole('button',{name:'Select shown',exact:true}).click();
  await page.getByLabel('Print pack title').fill('Weekend puzzles');
  await page.getByLabel('Mazes per page').selectOption('2');
  await page.getByRole('button',{name:'Print selected (2)',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as Window&{printCount?:number}).printCount)).toBe(1);
  const markup=await page.evaluate(()=>(window as Window&{printedMarkup?:string}).printedMarkup??'');
  expect(markup).toContain('Weekend puzzles');
  expect(markup).toContain('First puzzle');
  expect(markup).toContain('Second puzzle');
  expect(markup).toContain('layout-2');
  expect(markup.match(/<article>/g)).toHaveLength(2);
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

test('freeform topology exposes region controls and supports endpoints and gameplay',async({page})=>{
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  const topology=page.getByLabel('Maze topology');
  await expect(topology).toHaveValue('grid');
  await topology.selectOption('freeform');
  await expect(page.getByLabel(/Region density:/)).toBeVisible();
  await expect(page.getByLabel(/Irregularity:/)).toBeVisible();
  await expect(page.locator('#print-maze-only .freeform-outline')).toBeVisible();
  const walls=await page.locator('#print-maze-only .walls').innerHTML();
  await page.getByLabel(/Irregularity:/).fill('20');
  await expect.poll(()=>page.locator('#print-maze-only .walls').innerHTML()).not.toBe(walls);
  await page.getByRole('button',{name:'Set start',exact:true}).click();
  await page.getByRole('gridcell',{name:/Set start at region/}).first().click();
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  await expect(page.getByRole('application',{name:'Maze gameplay area'})).toBeFocused();
  await expect(page.getByRole('application',{name:'Maze gameplay area'}).getByRole('button')).not.toHaveCount(0);
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
  await openControlPage(page,'Play');
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  const game=page.getByRole('application',{name:'Maze gameplay area'});
  const gameControls=page.getByRole('group',{name:'Gameplay controls'});
  await expect(game).toBeFocused();
  await game.getByRole('button').first().click();
  await expect(gameControls.getByText('Moves',{exact:true}).locator('..')).toContainText('1');
  await game.getByRole('button',{name:'Move to column 1, row 4'}).click();
  await expect(gameControls.getByText('Revisits',{exact:true}).locator('..')).toContainText('1');
  await gameControls.getByRole('button',{name:'Pause',exact:true}).click();
  await page.reload();
  await openControlPage(page,'Play');
  await expect(gameControls.getByText('Paused',{exact:true})).toBeVisible();
  await expect(gameControls.getByText('Moves',{exact:true}).locator('..')).toContainText('2');
});

test('gameplay can quit to the maze and resume the preserved attempt',async({page})=>{
  await page.goto('./');
  await openControlPage(page,'Play');
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  const controls=page.getByRole('group',{name:'Gameplay controls'});
  const game=page.getByRole('application',{name:'Maze gameplay area'});
  await game.getByRole('button').first().click();
  await controls.getByRole('button',{name:'Quit',exact:true}).click();
  await expect(game).toHaveCount(0);
  await expect(controls.getByText('Paused',{exact:true})).toBeVisible();
  await expect(controls.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  await controls.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(page.getByRole('application',{name:'Maze gameplay area'})).toBeFocused();
  await expect(controls.getByText('Moves',{exact:true}).locator('..')).toContainText('1');
});

test('challenge links open the exact maze directly in gameplay',async({page})=>{
  await page.goto('./?v=2&w=7&h=9&seed=77&g=.3&b=.15&tau=.4&start=&goal=&challenge=1');
  await expect(page.getByRole('application',{name:'Maze gameplay area'})).toBeFocused();
  await expect(page.getByRole('group',{name:'Gameplay controls'}).getByText('Playing',{exact:true})).toBeVisible();
  await expect(page.getByLabel(/^Width:/)).toHaveValue('7');
  await expect(page.getByLabel(/^Height:/)).toHaveValue('9');
  await expect(page.getByText('seed 77',{exact:true})).toBeVisible();
});

test('shared benchmark links restore the complete Micromouse configuration',async({page})=>{
  await page.goto('./?v=2&w=16&h=16&seed=91&g=.3&b=.15&tau=.4&start=&goal=&benchmark=1&ms=tremaux&bc=25&msp=2.5&mac=7.5&mt=55&sr=3&sn=.12&pc=25&col=750&tr=6.5&diag=1');
  await expect(page.getByRole('tab',{name:'Robot',exact:true})).toHaveAttribute('aria-selected','true');
  const controls=page.locator('.mouse-controls');
  await expect(controls.getByText('Shared benchmark settings loaded.')).toBeVisible();
  await expect(controls.getByLabel('Maze seeds')).toHaveValue('25');
  await expect(controls.getByLabel('Exploration strategy')).toHaveValue('tremaux');
  await expect(controls.getByLabel(/^Maximum speed:/)).toHaveValue('2.5');
  await expect(controls.getByLabel(/^Sensor range:/)).toHaveValue('3');
  await expect(controls.getByLabel('Allow diagonal speed-run cornering')).toBeChecked();
  await expect(controls.getByRole('button',{name:'Share configuration'})).toBeVisible();
});

test('hints highlight a shortest-path move and completion shows assisted results',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('./');
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  const controls=page.getByRole('group',{name:'Gameplay controls'});
  for(let step=0;step<60&&!await page.getByRole('region',{name:'Maze results'}).isVisible();step++){
    await controls.getByRole('button',{name:'Show next move'}).click();
    const hint=page.locator('.gameplay-overlay .hint-move');await expect(hint).toHaveCount(1);await hint.click();
  }
  const results=page.getByRole('region',{name:'Maze results'});
  await expect(results).toContainText('Maze complete!');
  await expect(results).toContainText('Assisted completion');
  await expect(controls.getByText(/hints used.*excluded from rankings/)).toBeVisible();
  await expect(results.getByRole('button',{name:'Play again'})).toBeVisible();
  await expect(results.getByRole('button',{name:'New maze'})).toBeVisible();
});

test('play history records, restores, abandons, and clears attempts',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('./');
  await openControlPage(page,'Play');
  const history=page.getByRole('region',{name:'Play history'});
  await expect(history.getByText('Play a maze to start your history.')).toBeVisible();
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  const game=page.getByRole('application',{name:'Maze gameplay area'});
  await game.getByRole('button').first().click();
  await page.getByRole('group',{name:'Gameplay controls'}).getByRole('button',{name:'Pause',exact:true}).click();
  await expect(history.getByText('Paused',{exact:true})).toBeVisible();
  await expect(history.getByText('1 moves',{exact:true})).toBeVisible();
  await history.getByRole('button',{name:'Completed',exact:true}).click();
  await expect(history.getByText('No attempts match this filter.')).toBeVisible();
  await history.getByRole('button',{name:'All',exact:true}).click();
  await page.reload();
  await openControlPage(page,'Build');
  await page.getByText('Adjust size',{exact:true}).click();
  await page.getByLabel('Maze topology').selectOption('freeform');
  await openControlPage(page,'Play');
  await history.getByRole('button',{name:'Reopen',exact:true}).click();
  await expect(page.getByRole('group',{name:'Gameplay controls'}).getByRole('status')).toContainText('Paused');
  await expect(page.getByRole('group',{name:'Gameplay controls'}).getByText('Moves',{exact:true}).locator('..')).toContainText('1');
  await page.getByRole('group',{name:'Gameplay controls'}).getByRole('button',{name:'Resume',exact:true}).click();
  await page.getByRole('button',{name:'Generate new maze',exact:true}).click();
  await expect(history.getByText('Abandoned',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  await page.getByRole('group',{name:'Gameplay controls'}).getByRole('button',{name:'Pause',exact:true}).click();
  await expect(history.getByRole('button',{name:'Delete',exact:true})).toHaveCount(2);
  await history.getByRole('button',{name:'Delete',exact:true}).first().click();
  await expect(history.getByRole('button',{name:'Delete',exact:true})).toHaveCount(1);
  await history.getByRole('button',{name:'Clear history'}).click();
  await expect(history.getByText('Play a maze to start your history.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('local leaderboard ranks completed attempts and shows robot benchmark',async({page})=>{
  await page.addInitScript(()=>{
    const params={width:7,height:7,seed:42,g:.3,b:.15,tau:.4,generator:'dfs',topology:'grid'};
    const attempt=(id:string,elapsedMs:number,moves:number,revisits:number,completedAt:number,micromouse?:object)=>({version:1,id,mazeId:'shared-maze',gameKey:'shared-key',params,startedAt:completedAt-1000,updatedAt:completedAt,completedAt,status:'completed',elapsedMs,moves,revisits,route:['0,0','1,0'],micromouse});
    localStorage.setItem('maze:play-history:v1',JSON.stringify([
      attempt('fast',5000,12,2,3000,{totalTimeMs:4200,speedTimeMs:1300,speedCells:8,exploredPercent:42,turns:9}),
      attempt('efficient',7000,8,0,2000),attempt('slow',9000,10,1,1000),
    ]));
  });
  await page.goto('./');
  await openControlPage(page,'Play');
  const board=page.getByRole('region',{name:'Local leaderboard'});
  await expect(board.getByRole('row').nth(1)).toContainText('0:05.0');
  await expect(board.getByRole('row').nth(1)).toContainText('12');
  await board.getByRole('button',{name:'Fewest moves'}).click();
  await expect(board.getByRole('row').nth(1)).toContainText('0:07.0');
  await expect(board.getByRole('row').nth(1)).toContainText('8');
  await expect(board.getByRole('region',{name:'Micromouse benchmark'})).toContainText('8 cells');
  const shared=page.getByRole('region',{name:'Shared leaderboard'});
  await expect(shared.getByLabel('Enable online scores')).not.toBeChecked();
  await expect(shared.getByText('Online scores are not configured for this deployment.')).toBeVisible();
});

test('giant maze mode exposes larger sizes and pan and zoom controls',async({page})=>{
  await page.goto('./');
  await page.getByText('Adjust size',{exact:true}).click();
  const mode=page.getByLabel('Maze size mode');
  await mode.selectOption('giant');
  await expect(page.getByLabel(/^Width:/)).toHaveValue('43');
  await expect(page.getByLabel(/^Height:/)).toHaveValue('43');
  const viewport=page.getByRole('region',{name:'Giant maze viewport'});
  await expect(viewport).toBeVisible();
  await viewport.getByRole('button',{name:'Zoom in'}).click();
  await expect(viewport.getByLabel('Maze zoom level')).toHaveText('125%');
  await page.getByRole('group',{name:'Drawing tools'}).getByRole('button',{name:'Scroll'}).click();
  await expect(page.locator('.giant-maze-viewport')).toHaveClass(/is-pannable/);
  await viewport.getByRole('button',{name:'Fit',exact:true}).click();
  await expect(viewport.getByLabel('Maze zoom level')).toHaveText('100%');
  await mode.selectOption('standard');
  await expect(page.getByLabel(/^Width:/)).toHaveValue('41');
  await expect(viewport).toBeHidden();
});

test('Difficulty 2 score is labeled as estimated and retains the legacy score',async({page})=>{
  await page.goto('./');
  const stats=page.getByText('Stats',{exact:true}).locator('..');
  await expect(stats.getByText('Estimated difficulty',{exact:true}).locator('..')).toContainText(/\d+\/100/);
  await expect(stats.getByText('Legacy difficulty D',{exact:true})).toBeVisible();
  await expect(stats).toContainText('not yet calibrated from human results');
});

test('Micromouse explores, exposes phases, and disables physics for freeform mazes',async({page})=>{
  await page.goto('./');
  await openControlPage(page,'Robot');
  const controls=page.locator('.mouse-controls');
  await controls.getByLabel('Competition format').selectOption('classic');
  await controls.getByLabel('Exploration strategy').selectOption('tremaux');
  await expect(controls.getByText(/least-visited passage/)).toBeVisible();
  await controls.getByRole('button',{name:'Compare all strategies'}).click();
  const comparison=controls.getByRole('region',{name:'Strategy comparison'});
  await expect(comparison.getByRole('row')).toHaveCount(4);
  await expect(comparison).toContainText('Flood Fill');
  await expect(comparison).toContainText('Trémaux');
  await expect(comparison).toContainText('Right-Wall');
  await expect(comparison.getByRole('group',{name:'Strategy comparison export'}).getByRole('button')).toHaveCount(2);
  await controls.getByText('Batch benchmark',{exact:true}).click();
  await controls.getByRole('button',{name:'Run batch benchmark'}).click();
  await expect(controls.getByText('Benchmark complete — 10 seeds')).toBeVisible();
  await expect(controls.getByRole('table',{name:'Batch benchmark results'}).getByRole('row')).toHaveCount(4);
  await expect(controls.getByRole('group',{name:'Batch benchmark export'}).getByRole('button')).toHaveCount(2);
  await expect(page.getByLabel(/^Width:/)).toHaveValue('16');
  await expect(page.getByLabel(/^Height:/)).toHaveValue('16');
  await expect(controls.getByRole('region',{name:'Competition dimensions'})).toContainText('2.88×2.88 m nominal');
  await expect(page.locator('.endpoint-controls > span')).toContainText('Start: 1,16');
  await expect(page.locator('.endpoint-controls > span')).toContainText('Goal: 8,8');
  await expect(page.getByLabel('4-cell goal zone')).toBeVisible();
  await controls.getByLabel('Competition format').selectOption('half');
  await expect(page.getByLabel(/^Width:/)).toHaveValue('32');
  await expect(page.getByLabel(/^Height:/)).toHaveValue('32');
  await expect(controls.getByRole('region',{name:'Competition dimensions'})).toContainText('9 cm cell pitch');
  await controls.getByLabel('Competition format').selectOption('classic');
  await controls.getByLabel('Robot profile').selectOption('sprint');
  await expect(controls.getByLabel(/^Maximum speed:/)).toHaveValue('3');
  await controls.getByLabel(/^Maximum speed:/).fill('2.5');
  await expect(controls.getByText('Changes not applied',{exact:true})).toBeVisible();
  await controls.getByRole('button',{name:'Reset changes',exact:true}).click();
  await expect(controls.getByLabel(/^Maximum speed:/)).toHaveValue('1.5');
  await controls.getByLabel('Robot profile').selectOption('sprint');
  await controls.getByLabel(/^90° turn:/).fill('55');
  await expect(controls.getByLabel('Robot profile')).toHaveValue('custom');
  await controls.getByLabel('Allow diagonal speed-run cornering').check();
  await expect(controls.getByText(/cuts across learned 90° corners/)).toBeVisible();
  await controls.getByLabel(/^Traction limit:/).fill('2');
  await expect(controls.getByText('Effective acceleration: 2.0 m/s².')).toBeVisible();
  await controls.getByLabel(/^Sensor range:/).fill('3');
  await controls.getByLabel(/^Reading noise:/).fill('5');
  await controls.getByLabel(/^Position correction:/).fill('20');
  await controls.getByLabel(/^Collision recovery:/).fill('750');
  await expect(controls.getByText(/Noise is deterministic/)).toBeVisible();
  await controls.getByLabel(/^Reading noise:/).fill('0');
  await controls.getByRole('button',{name:'Apply changes',exact:true}).click();
  await expect(controls.getByText('Changes not applied',{exact:true})).toHaveCount(0);
  await controls.getByLabel(/^Playback speed:/).fill('250');
  await controls.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.locator('.micromouse-overlay-svg')).toBeVisible();
  await expect(page.locator('.mouse-goal-zone rect')).toHaveCount(4);
  await controls.getByRole('button',{name:'Pause',exact:true}).click();
  await controls.getByRole('button',{name:'Step',exact:true}).click();
  await controls.getByRole('button',{name:'Step',exact:true}).click();
  await expect(page.locator('.mouse-discovered rect')).not.toHaveCount(0);
  await controls.getByLabel('Flood values').check();
  await controls.getByRole('button',{name:'Speed',exact:true}).click();
  await expect(controls.getByRole('status')).toContainText('Speed');
  await expect(controls.getByText('Speed run')).toBeVisible();
  await expect(controls.getByText('Diagonal cuts')).toBeVisible();
  await expect(controls.getByText('Effective acceleration',{exact:true})).toBeVisible();
  await openControlPage(page,'Build');
  await page.getByText('Adjust size',{exact:true}).click();
  await page.getByLabel('Maze topology').selectOption('freeform');
  await openControlPage(page,'Robot');
  await expect(controls.getByText('Micromouse physics requires grid topology.')).toBeVisible();
  await expect(page.locator('.micromouse-overlay-svg')).toHaveCount(0);
});

test('storage failure does not pretend to save a maze', async ({page}) => {
  await page.goto('./');
  await openControlPage(page,'Library');
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
  await openControlPage(page,'Analyze');
  await expect(page.getByText('Animation Algorithms',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Animation mode')).toHaveValue('build-solve');
  const generator=page.getByLabel('Generation algorithm');
  const solver=page.getByLabel('Solving algorithm');
  await expect(generator).toHaveValue('dfs');
  await expect(generator.locator('option')).toHaveText(['Randomized DFS','Randomized Prim','Randomized Kruskal','Wilson']);
  await expect(solver).toHaveValue('dfs');
  await expect(solver.locator('option')).toHaveText(['DFS','BFS','Dijkstra','A*']);
  await expect(page.locator('.generation-overlay-svg')).toBeVisible();
  const animationControls=page.getByRole('group',{name:'Animation playback controls'});
  await animationControls.getByRole('button',{name:'Pause',exact:true}).click();
  await animationControls.getByRole('button',{name:'Step',exact:true}).click();
  await expect(page.getByText(/^Building.*[1-9]/)).toBeVisible();
  await page.getByLabel('Build animation color').fill('#7c3aed');
  await page.getByLabel('Build animation opacity').fill('70');
  await expect(page.locator('.generation-overlay-svg path').first()).toHaveAttribute('stroke','#7c3aed');
  await expect(page.locator('.generation-overlay-svg path').first()).toHaveAttribute('opacity','0.7');
  const originalMaze=await page.locator('#print-maze-only .walls').innerHTML();
  await generator.selectOption('prim');
  await expect.poll(()=>page.locator('#print-maze-only .walls').innerHTML()).not.toBe(originalMaze);
  await generator.selectOption('wilson');
  await expect(page.getByText('Uses loop-erased random walks to create an unbiased spanning-tree maze.')).toBeVisible();
  await solver.selectOption('astar');
  await expect(page.getByText(/straight-line distance/)).toBeVisible();
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
  await page.getByRole('button',{name:'Compare solvers side by side'}).click();
  const comparison=page.getByRole('region',{name:'Side-by-side solver playback'});
  await expect(comparison.getByLabel('A* playback')).toBeVisible();
  await expect(comparison.getByLabel('BFS playback')).toBeVisible();
  await comparison.getByLabel('Left solver').selectOption('dfs');
  await expect(comparison.getByLabel('DFS playback')).toBeVisible();
  const comparisonControls=comparison.getByRole('group',{name:'Comparison playback controls'});
  await comparisonControls.getByRole('button',{name:'Step',exact:true}).click();
  await expect(comparison.getByLabel(/^Shared progress/)).toHaveValue('2');
  await comparison.getByLabel(/^Shared progress/).fill('100');
  await expect(comparison.getByLabel('DFS live search metrics')).toContainText(/Discovered.*\/\d+/);
  await comparison.getByText('Multi-seed charts',{exact:true}).click();
  await comparison.getByRole('button',{name:'Run multi-seed analysis'}).click();
  await expect(comparison.getByText('Analysis complete — 10 seeds')).toBeVisible();
  const charts=comparison.getByRole('region',{name:'Multi-seed solver charts'});
  await expect(charts.getByRole('region')).toHaveCount(5);
  await expect(charts.getByRole('region',{name:'Average expanded'})).toContainText('DFS');
  await expect(charts.getByRole('region',{name:'Average expanded'})).toContainText('A*');
});

test('difficulty search preserves the seed', async ({page}) => {
  await page.goto('./');
  await openControlPage(page,'Analyze');
  await page.getByText('Adjust difficulty',{exact:true}).click();
  await expect(page.getByLabel('Braid strategy')).toHaveValue('random');
  await page.getByLabel('Braid strategy').selectOption('difficulty');
  await expect(page.getByLabel('Braid strategy')).toHaveValue('difficulty');
  const seed = await page.locator('header').innerText();
  await page.getByLabel('Search budget').selectOption('10000');
  await page.getByRole('button',{name:'Max difficulty',exact:true}).click();
  await page.getByRole('button',{name:'Stop search',exact:true}).click();
  await page.getByLabel('Search budget').selectOption('250');
  await page.getByRole('button',{name:'Max difficulty',exact:true}).click();
  await expect(page.getByRole('button',{name:'Max difficulty',exact:true})).toBeEnabled();
  const progress=page.getByLabel('Difficulty search progress');
  const searchStatus=progress.locator('..');
  await expect(searchStatus).toContainText(/Finished.*250 \/ 250 candidates/);
  await expect(searchStatus).toContainText(/Best:.*\d+\/100/);
  await expect(progress).toHaveAttribute('value','250');
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
  await openControlPage(page,'Analyze');
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
