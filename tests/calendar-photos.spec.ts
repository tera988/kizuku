import {test,expect} from '@playwright/test';
import {parseMealAnalysis} from '../src/photos';
test.beforeEach(async ({page}) => { await page.addInitScript(() => localStorage.setItem('kizuku-concept-v1','seen')); });
test('calendar navigates history and no decorative English headings remain',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/');await page.getByRole('button',{name:'デモを見る'}).click();
 await expect(page.getByText('YOUR EVERYDAY, A LITTLE BETTER')).toHaveCount(0);await expect(page.getByText("TODAY'S WELLBEING")).toHaveCount(0);
 await page.getByRole('button',{name:'ライフログ',exact:true}).click();
 await page.getByText('カレンダーで過去を見る',{exact:true}).click();
 await page.getByRole('button',{name:'前の月',exact:true}).click();
 const dateButton=page.locator('.calendar-grid button.has-records').first();const date=(await dateButton.getAttribute('aria-label'))!.slice(0,10);await dateButton.click();
 await expect(page.getByLabel('表示する日付')).toHaveValue(date);await expect(page.locator('.logrow')).toHaveCount(9);await expect(dateButton).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/calendar-iphone.png',fullPage:true});
 await page.getByRole('button',{name:'写真を追加'}).click();await expect(page.getByRole('dialog',{name:'写真を追加・分析'})).toBeVisible();await expect(page.getByText('写真分析はアカウントを作成して利用できます。体験モードでは写真を送信・保存しません。')).toBeVisible();
});
test('photo analysis validates ranges and both JSON response formats',()=>{
 const valid={isFood:true,foods:['サラダ'],caloriesMin:100,caloriesMax:300,observations:['野菜が見えます'],suggestions:['他の食事との組み合わせも確認しましょう'],uncertainty:'量や材料は不明です。'};
 expect(parseMealAnalysis(valid).foods).toEqual(['サラダ']);expect(parseMealAnalysis('```json\n'+JSON.stringify(valid)+'\n```').caloriesMax).toBe(300);
 expect(()=>parseMealAnalysis({...valid,caloriesMax:50})).toThrow();expect(()=>parseMealAnalysis({...valid,caloriesMin:'100'})).toThrow();
 expect(parseMealAnalysis({...valid,isFood:false}).caloriesMin).toBeNull();expect(parseMealAnalysis({...valid,isFood:false}).suggestions).toEqual([]);
});
test('photo upload, review, persistence and private image access',async({page,browser})=>{
 test.skip(!process.env.KIZUKU_PHOTO_FILE,'Set KIZUKU_PHOTO_FILE to a non-private test JPEG to run real Workers AI');test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:375,height:812});await page.goto('/');
 const username='photo_ui_'+Date.now(),password=crypto.randomUUID();
 await page.locator('input[name=username]').fill(username);await page.locator('input[name=password]').fill(password);await page.getByRole('button',{name:'アカウントを作成',exact:true}).click();await expect(page.getByRole('heading',{name:'今日'})).toBeVisible();
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
 try{
  await page.getByRole('button',{name:'機器',exact:true}).click();
  const aiSwitch=page.getByRole('switch',{name:'AI分析を使う',exact:true});await aiSwitch.click();await expect(aiSwitch).toBeChecked();await expect(aiSwitch).toBeEnabled();
  await page.getByRole('button',{name:'ライフログ',exact:true}).click();await page.getByRole('button',{name:'写真を追加'}).click();
  await page.getByLabel('食事の写真ファイル').setInputFiles(process.env.KIZUKU_PHOTO_FILE!);await expect(page.getByAltText('送信前の写真プレビュー')).toBeVisible();
  await page.getByRole('checkbox',{name:'この写真をCloudflare Workers AIで分析し、縮小画像と結果を保存する'}).check();await page.getByRole('button',{name:'写真を分析する',exact:true}).click();
  await expect(page.getByRole('heading',{name:'写真の分析結果'})).toBeVisible({timeout:90000});await expect(page.getByText('食事の推定',{exact:true})).toBeVisible();await expect.poll(()=>page.getByAltText('分析した写真').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);await page.screenshot({path:'test-results/photo-analysis-iphone.png',fullPage:true});
  await page.getByRole('textbox',{name:'料理名・タイトル'}).fill('写真から記録したサラダ');await page.getByRole('button',{name:'この内容で記録',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();await page.getByRole('button',{name:'ライフログ',exact:true}).click();await expect(page.getByRole('heading',{name:'写真から記録したサラダ'})).toBeVisible();
  const photos=await (await page.request.get('/api/photos')).json();expect(photos).toHaveLength(1);const imageURL=photos[0].imageUrl;
  expect((await page.request.get(imageURL)).status()).toBe(200);
  const other=await browser.newContext({baseURL:process.env.TEST_URL||'http://localhost:8791'});await other.request.post('/api/register',{data:{username:'photo_other_'+Date.now(),password:crypto.randomUUID()}});
  try{expect((await other.request.get(imageURL)).status()).toBe(404);expect((await other.request.post('/api/photos/'+photos[0].id+'/confirm',{data:{title:'invalid',date,time:'12:00'}})).status()).toBe(404)}finally{await other.request.delete('/api/account');await other.close()}
  await page.request.delete('/api/photos/'+photos[0].id);const s=await (await page.request.get('/api/state')).json();expect(s.entries[0].photoId).toBeUndefined();expect(s.entries[0].mealAnalysis).toBeDefined();expect((await page.request.get(imageURL)).status()).toBe(404);
  expect(errors).toEqual([]);
 }finally{await page.request.delete('/api/account')}
});
