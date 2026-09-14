import { test,expect } from '@playwright/test';

test('large and Giant mazes expose costs while keeping animation DOM compact',async({page})=>{
  await page.goto('./');
  for(const size of [32,41,101]){
    await page.evaluate(value=>{const settings=JSON.parse(localStorage.getItem('maze:settings:v1')??'{}');localStorage.setItem('maze:settings:v1',JSON.stringify({...settings,width:value,height:value,controlsOpen:true}));},size);
    await page.reload();
    await page.getByRole('tab',{name:'Analyze',exact:true}).click();
    await page.getByText('Current maze costs',{exact:true}).click();
    const costs=page.getByRole('region',{name:'Maze performance costs'});
    await expect(costs).toContainText(`${(size*size).toLocaleString()} cells`);
    for(const label of ['Generation','Graph','Difficulty','Identity','Solver','SVG render'])await expect(costs.getByText(label,{exact:true}).locator('..')).toContainText(/\d+(?:\.\d)? ms/);
    await expect(page.locator('.generation-overlay-svg path')).toHaveCount(1);
    await expect(page.locator('.generation-overlay-svg path')).toHaveAttribute('d',/M /);
  }
});
