import {z} from 'zod';
export const mealAnalysisSchema=z.object({
 isFood:z.boolean(),
 foods:z.array(z.string().min(1).max(100)).max(15),
 caloriesMin:z.number().finite().min(0).max(10000).nullable(),
 caloriesMax:z.number().finite().min(0).max(10000).nullable(),
 observations:z.array(z.string().min(1).max(350)).max(5),
 suggestions:z.array(z.string().min(1).max(350)).max(3),
 uncertainty:z.string().min(1).max(600),
}).refine(v=>v.caloriesMin===null&&v.caloriesMax===null||v.caloriesMin!==null&&v.caloriesMax!==null&&v.caloriesMax>=v.caloriesMin).refine(v=>!v.isFood||v.foods.length>0);
export type MealAnalysis=z.infer<typeof mealAnalysisSchema>;
export type Photo={id:string;date:string;time:string;source:'manual'|'glasses';status:'pending'|'confirmed';analysis:MealAnalysis;recordId:string|null;imageUrl:string;createdAt:string};
export const MAX_PHOTO_BYTES=200000;
export function parseMealAnalysis(response:unknown):MealAnalysis {
 let value=response;
 if(typeof response==='string'){const start=response.indexOf('{'),end=response.lastIndexOf('}');if(start<0||end<start)throw new Error('AI_FORMAT');value=JSON.parse(response.slice(start,end+1));}
 const result=mealAnalysisSchema.safeParse(value);
 if(!result.success)throw new Error('AI_FORMAT');
 const v=result.data;
 return v.isFood?v:{...v,foods:[],caloriesMin:null,caloriesMax:null,suggestions:[]};
}
export async function preparePhoto(file:File):Promise<string> {
 if(file.size>25*1024*1024)throw Error('25MB以内の写真を選んでください。');
 if(!file.type.startsWith('image/'))throw Error('画像ファイルを選んでください。');
 const url=URL.createObjectURL(file);
 try {
  const image=new Image();image.src=url;await image.decode().catch(()=>{throw Error('この写真を開けませんでした。JPEG・PNG・WebP形式で選び直してください。')});
  const ratio=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('写真の準備ができませんでした。');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.7,.55,.4,.25]){const data=canvas.toDataURL('image/jpeg',quality);if(data.split(',')[1].length*3/4<=MAX_PHOTO_BYTES)return data;}
  throw Error('写真を十分に小さくできませんでした。範囲を絞って選び直してください。');
 } finally {URL.revokeObjectURL(url)}
}
