import {useLiveQuery} from 'dexie-react-hooks';
import {db,days,minute,pretty} from './database';
import {CalendarDays,ArrowUpRight,Coffee,MapPin,Clock3,Check,Moon,Sun} from 'lucide-react';
import {useEffect,useState} from 'react';
import {useTheme} from './theme';
import InstallApp from './InstallApp';
import {WidgetSkeleton} from './Skeleton';

export default function WidgetView({embedded=false}:{embedded?:boolean}){
 const result=useLiveQuery(()=>db.classes.toArray(),[]);
 const items=result??[];
 const [theme,setTheme]=useTheme();
 const [now,setNow]=useState(new Date());
 const [view,setView]=useState<'today'|'next'>('today');
 useEffect(()=>{
  const tick=()=>setNow(new Date());
  const timer=window.setInterval(tick,15000);
  window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
 },[]);
 if(result===undefined)return <WidgetSkeleton embedded={embedded}/>;
 const today=items.filter(x=>x.day===now.getDay()).sort((a,b)=>minute(a.start)-minute(b.start));
 const current=now.getHours()*60+now.getMinutes();
 const upcoming=items.map(item=>({item,offset:(item.day-now.getDay()+7)%7}))
  .map(c=>({...c,offset:c.offset===0&&minute(c.item.end)<=current?7:c.offset}))
  .sort((a,b)=>a.offset-b.offset||minute(a.item.start)-minute(b.item.start));
 const next=upcoming[0];
 const list=view==='today'?today:next?[next.item]:[];
 const live=today.find(c=>minute(c.start)<=current&&minute(c.end)>current);
 return <div className={`widget-root ${embedded?'widget-embedded':''}`}>
  <header className="widget-header"><span className="brand-icon"><CalendarDays size={20}/></span><div><strong>SmartSched</strong><small>{days[now.getDay()]} · {now.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small></div><button className="icon-button" aria-label="Toggle widget theme" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button></header>
  <div className="widget-tabs" role="group" aria-label="Widget view"><button aria-pressed={view==='today'} onClick={()=>setView('today')}>Today <span>{today.length}</span></button><button aria-pressed={view==='next'} onClick={()=>setView('next')}>Up next</button></div>
  <div className="widget-summary"><span className="status-pulse"/>{live?`${live.subject} · in progress`:today.some(c=>minute(c.start)>current)?`${today.filter(c=>minute(c.start)>current).length} ${today.filter(c=>minute(c.start)>current).length===1?'class':'classes'} still to come`:next?`Next class ${next.offset===1?'tomorrow':next.offset===0?'today':`on ${days[next.item.day]}`}`:'Your time, your rhythm.'}</div>
  <div className="widget-list">{list.length?list.map(c=>{
   const sameDay=view==='today'||next?.offset===0;
   const done=sameDay&&minute(c.end)<=current;
   const active=sameDay&&minute(c.start)<=current&&minute(c.end)>current;
   return <article key={c.id} className={`widget-class ${active?'active':''} ${done?'done':''}`} style={{borderLeftColor:c.color}}>
    <div className="widget-class-title"><strong>{c.subject}</strong>{active?<span className="now-pill">Live</span>:done?<Check size={15}/>:null}</div>
    {view==='next'&&<span className="widget-day">{days[c.day]}{next?.offset===7?' · next week':''}</span>}
    <p><Clock3 size={13}/>{pretty(c.start)} – {pretty(c.end)}</p>
    <p><MapPin size={13}/>{c.room||'Room not set'}</p>{c.instructor&&<small>{c.instructor}</small>}
   </article>;
  }):<div className="widget-empty"><Coffee size={30}/><h3>{items.length?'No classes today':'Your week starts here'}</h3><p>{items.length?'Enjoy a little breathing room. Check Up next to see what’s coming.':'Open the planner to add or import your schedule.'}</p></div>}</div>
  <footer className="widget-footer"><a className="secondary" href="/" target={embedded?'_blank':'_self'} rel="noopener">Open planner <ArrowUpRight size={15}/></a>{!embedded&&<InstallApp/>}</footer>
 </div>;
}
