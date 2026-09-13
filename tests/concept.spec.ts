import {test,expect} from '@playwright/test';
test('concept, five tabs, device filtering and preparation on mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:375,height:812});await page.goto('/');
 await expect(page.getByText('2036',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'次の場面へ'}).click();await expect(page.getByRole('heading',{name:/あなたは今日も、/})).toBeVisible();
 await page.getByRole('button',{name:'次の場面へ'}).click();await expect(page.locator('.constellation>span')).toHaveCount(9);
 await page.screenshot({path:'test-results/concept-iphone.png'});
 await page.getByRole('button',{name:'次の場面へ'}).click();await expect(page.getByText('決めるのは、あなた。')).toBeVisible();
 await page.getByRole('button',{name:'次の場面へ'}).click();await page.getByRole('button',{name:'はじめる',exact:true}).click();
 await page.getByRole('button',{name:'デモを見る'}).click();await expect(page.getByRole('heading',{name:'AI Today'})).toBeVisible();await expect(page.locator('.todayitem')).toHaveCount(3);
 await page.screenshot({path:'test-results/new-home-iphone.png',fullPage:true});
 for(const name of ['ライフログ','傾向','プラン','機器']){await page.getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('switch',{name:'スマートウォッチのデータを使う'}).uncheck();await page.getByRole('button',{name:'プラン',exact:true}).click();await expect(page.getByRole('heading',{name:'睡眠のプラン'})).toHaveCount(0);
 await page.getByRole('button',{name:/鶏肉と野菜の蒸し焼き/}).click();await expect(page.getByText('こうしておきますね')).toBeVisible();await page.getByRole('button',{name:'お願い',exact:true}).click();await expect(page.getByRole('heading',{name:'買い物リスト'})).toBeVisible();
 await page.getByRole('button',{name:'ライフログ',exact:true}).click();await expect(page.locator('.input-count strong')).toHaveText('0回');await page.getByText('カレンダーで過去を見る',{exact:true}).click();await page.getByRole('button',{name:'前の月',exact:true}).click();await page.locator('.calendar-grid button.has-records').first().click();await expect(page.locator('.logrow')).toHaveCount(8);
 await page.getByRole('button',{name:'機器',exact:true}).click();await page.getByRole('button',{name:/コンセプトをもう一度見る/}).click();await expect(page.getByText('2036',{exact:true})).toBeVisible();await page.getByRole('button',{name:'スキップ'}).click();await expect(page.getByRole('heading',{name:'機器',exact:true})).toBeVisible();expect(errors).toEqual([]);
 await page.reload();await expect(page.locator('.concept')).toHaveCount(0);
});
test('introduction advances automatically and reduced motion remains manual',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/あなたは今日も、/})).toBeVisible({timeout:7000});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.getByText('2036',{exact:true})).toBeVisible();await page.waitForTimeout(5200);await expect(page.getByText('2036',{exact:true})).toBeVisible();
});
