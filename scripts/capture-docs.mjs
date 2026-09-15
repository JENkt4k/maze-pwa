import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output='docs/images';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const page=await context.newPage();
await page.addInitScript(()=>{
  localStorage.setItem('maze:settings:v1',JSON.stringify({width:19,height:19,seed:42,g:.3,b:.15,tau:.4,generator:'dfs',controlsOpen:true,lockSize:true,solverEnabled:true,solverAlgorithm:'astar',animationMode:'build-solve',solverStepMs:80,generationColor:'#14b8a6',generationOpacity:.35,solverColor:'#e11d48',solverOpacity:.72}));
});
await page.goto('http://127.0.0.1:5173/');
const controls=page.locator('#controls-panel');
const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
await page.screenshot({path:`${output}/01-overview.png`});

await tab('Build');
await page.getByText('Adjust size',{exact:true}).click();
await page.getByLabel('Maze shape').selectOption('heart');
await page.waitForTimeout(150);
await page.screenshot({path:`${output}/02-build-shapes.png`});
await controls.screenshot({path:`${output}/03-build-controls.png`});

await tab('Analyze');
await controls.screenshot({path:`${output}/04-animation-analysis.png`});

await tab('Play');
await controls.screenshot({path:`${output}/05-gameplay-history.png`});
await page.getByRole('region',{name:'Serverless competition room'}).screenshot({path:`${output}/06-serverless-competition.png`});

await tab('Robot');
await controls.screenshot({path:`${output}/07-micromouse.png`});

await tab('Library');
await page.getByLabel('Maze name').fill('Heart practice maze');
await page.getByLabel('Maze folder').fill('Practice');
await page.getByLabel('Maze tags').fill('heart, beginner');
await page.getByRole('button',{name:'Save current',exact:true}).click();
await page.getByText('All app data',{exact:true}).click();
await controls.screenshot({path:`${output}/08-library-backup.png`});

await tab('Build');
await page.getByLabel('Maze topology').selectOption('freeform');
await page.waitForTimeout(150);
await page.screenshot({path:`${output}/09-freeform-rounded.png`});

await page.getByLabel('Theme').selectOption('dark');
await page.screenshot({path:`${output}/10-dark-accessible-theme.png`});

const mobile=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const mobilePage=await mobile.newPage();
await mobilePage.addInitScript(()=>localStorage.setItem('maze:settings:v1',JSON.stringify({width:15,height:15,seed:42,g:.3,b:.15,tau:.4,controlsOpen:true,lockSize:true})));
await mobilePage.goto('http://127.0.0.1:5173/');
await mobilePage.screenshot({path:`${output}/11-mobile-layout.png`});
await mobilePage.getByRole('tab',{name:'Play',exact:true}).click();
await mobilePage.locator('#controls-panel').screenshot({path:`${output}/12-mobile-play-controls.png`});

await mobile.close();
await context.close();
await browser.close();
