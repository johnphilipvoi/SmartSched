import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {PanelsTopLeft,ExternalLink,X,Pin} from 'lucide-react';
import Modal from './Modal';
import WidgetView from './WidgetView';

type PiPWindow=Window&{documentPictureInPicture?:{requestWindow:(options:{width:number;height:number})=>Promise<Window>}};
export default function WidgetLauncher(){
 const [open,setOpen]=useState(false);
 const [floating,setFloating]=useState<Window|null>(null);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!floating)return;
  const sync=()=>{floating.document.documentElement.dataset.theme=document.documentElement.dataset.theme;};
  sync();
  const observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const closed=()=>setFloating(null);floating.addEventListener('pagehide',closed);
  return()=>{observer.disconnect();floating.removeEventListener('pagehide',closed);if(!floating.closed)floating.close();};
 },[floating]);
 async function float(){
  if(floating&&!floating.closed){floating.focus();return;}
  const api=(window as PiPWindow).documentPictureInPicture;
  if(!api)return;
  try{
   const win=await api.requestWindow({width:360,height:520});
   document.querySelectorAll('style,link[rel="stylesheet"]').forEach(node=>win.document.head.appendChild(node.cloneNode(true)));
   win.document.title='SmartSched · Schedule widget';
   setFloating(win);setOpen(false);
  }catch{setMessage('The floating window could not open. Try “Open compact window” instead.');}
 }
 function popup(){
  const win=window.open('/?widget=1','smartsched-widget','popup,width=380,height=600');
  if(win){win.focus();setOpen(false);}else setMessage('Allow pop-ups for this site, or open the compact view using the link below.');
 }
 return <><button className="secondary widget-launch-button" onClick={()=>setOpen(true)}><PanelsTopLeft size={16}/><span>Widget</span></button>
 {open&&<Modal label="Schedule widget" onClose={()=>setOpen(false)}><div className="section-heading"><div><span className="eyebrow">YOUR DAY, WITHIN REACH</span><h2>Schedule widget</h2></div><button className="icon-button" aria-label="Close widget options" onClick={()=>setOpen(false)}><X size={20}/></button></div><p className="section-description">A compact live view of your classes, synced with this browser’s planner.</p><div className="widget-preview"><WidgetView embedded/></div><div className="widget-launch-actions">{Boolean((window as PiPWindow).documentPictureInPicture)&&<button className="primary" onClick={float}><Pin size={16}/> Float above other windows</button>}<button className="secondary" onClick={popup}><ExternalLink size={16}/> Open compact window</button><a className="link" href="/?widget=1" target="_blank" rel="noopener">Open mobile / installable view <ExternalLink size={14}/></a></div>{message&&<p className="error" role="status">{message}</p>}<p className="note">On mobile, open the compact view and add it to your home screen. It updates while open. A PWA cannot place a live native widget on the iOS/Android home screen or the Windows widget board.</p></Modal>}
 {floating&&createPortal(<WidgetView embedded/>,floating.document.body)}</>;
}
