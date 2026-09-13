import {readFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:8791';let cookie='';
async function api(path,method='GET',data){const r=await fetch(base+'/api/'+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();if(!r.ok)throw Error(r.status+': '+JSON.stringify(v));return v}
try{
 await api('register','POST',{username:'photo_check_'+Date.now(),password:crypto.randomUUID()});
 const s=await api('state');s.settings.aiConsent=true;await api('settings','PUT',s.settings);
 const image='data:image/jpeg;base64,'+(await readFile(process.argv[2]||'/tmp/kizuku-test-salad.jpg')).toString('base64');
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
 const p=await api('photos/analyze','POST',{image,date,time:'12:00',source:'manual'});console.log('Analysis:',JSON.stringify(p.analysis));
 if(!p.analysis.isFood)throw Error('Food was not recognized');
 const response=await fetch(base+p.imageUrl,{headers:{Cookie:cookie}});if(response.status!==200)throw Error('Photo retrieval failed');const length=(await response.arrayBuffer()).byteLength;if(length<1000)throw Error('Empty image');console.log('Image bytes:',length);
 await api('photos/'+p.id+'/confirm','POST',{date,time:'12:00',title:'検証用サラダ',note:'公開写真による動作検証'});
 const confirmed=await api('state');if(confirmed.entries.length!==1||!confirmed.entries[0].mealAnalysis)throw Error('Photo record not saved');console.log('Confirmed record saved');
 await api('records/'+confirmed.entries[0].id,'DELETE');if((await api('photos')).length!==0)throw Error('Photo not cascade-deleted');console.log('Record + photo deletion passed');
}finally{if(cookie)console.log('Account cleanup:',await api('account','DELETE'))}
