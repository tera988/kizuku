import { useEffect, useState, type CSSProperties } from 'react';
import { Watch, Glasses, Mic, ScanFace, Scale, Wind, Sun, CalendarDays, HeartPulse, UserRound, ArrowRight } from 'lucide-react';
const instruments = [Watch, Glasses, Mic, ScanFace, Scale, Wind, Sun, CalendarDays, HeartPulse];
const captions = ['腕時計が、眠りを。','メガネが、食事を。','ネックレスが、会話を。','鏡が、表情を。','体重計が、変化を。','エアコンが、環境を。','天気が、空模様を。','カレンダーが、忙しさを。','予約アプリが、健診を。'];
export default function Concept({ onFinish }: { onFinish: () => void }) {
  const [scene,setScene] = useState(0);
  const [pulse,setPulse] = useState(0);
  useEffect(() => { if(scene===4 || matchMedia('(prefers-reduced-motion: reduce)').matches)return; const timer=setTimeout(()=>setScene(s=>s+1),scene===2?6500:5000);return()=>clearTimeout(timer); },[scene]);
  useEffect(()=>{setPulse(0);if(scene!==2)return;const timer=setInterval(()=>setPulse(p=>Math.min(9,p+1)),500);return()=>clearInterval(timer)},[scene]);
  const next=()=>setScene(s=>Math.min(4,s+1));
  return <div className="concept" role="dialog" aria-modal="true" aria-label="KIZUKUのコンセプト">
    <header><span>KIZUKU <small>未来の暮らし</small></span><button onClick={onFinish}>スキップ</button></header>
    <div className="concept-stage">{scene<4&&<button className="concept-next" onClick={next} aria-label="次の場面へ"/>}
      <div className="concept-scene" key={scene}>
        {scene===0&&<><span className="future-year">2036</span><h1>10年後の、ある朝。</h1><div className="horizon"/></>}
        {scene===1&&<><div className="orbit-light"/><h1>あなたは今日も、<br/>何ひとつ、<br/>記録していない。</h1></>}
        {scene===2&&<><div className="constellation"><UserRound className="person" size={56}/>{instruments.map((Icon,i)=><span key={i} className={i<=pulse?'lit':''} style={{'--angle':`${i*40}deg`} as CSSProperties}><Icon size={23}/></span>)}</div><h1 className="device-caption">{pulse<9?captions[pulse]:'暮らしているだけで、'}{pulse===9&&<><br/>からだの声が集まる。</>}</h1></>}
        {scene===3&&<><h1>AIが、<br/>「いつもと違う」に気づく。</h1><div className="concept-notification"><span>KIZUKU · たとえば、こんな朝</span><p>最近、眠りが少し短めです。<br/>今夜は早めに休む準備をしますか？</p></div><h2>決めるのは、あなた。</h2></>}
        {scene===4&&<><div className="concept-logo">k<span>•</span></div><h1 className="wordmark">KIZUKU</h1><p className="concept-promise">記録しない。<br/>AIが気づいて、次の一歩を用意する。</p></>}
      </div>
    </div>
    <footer>{scene===4?<><button className="concept-start" onClick={onFinish}>はじめる <ArrowRight size={18}/></button><small>未来のコンセプトです。今は手入力と写真から始められます。</small></>:<span>タップして次へ</span>}<div className="scene-dots">{[0,1,2,3,4].map(i=><button key={i} aria-label={`場面${i+1}`} aria-current={i===scene?'step':undefined} onClick={()=>setScene(i)}/>)}</div></footer>
  </div>
}
