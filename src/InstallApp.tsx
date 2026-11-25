import {useEffect,useState} from 'react';
import {Download,Check,Share,Monitor,Smartphone,X} from 'lucide-react';
import Modal from './Modal';

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallApp(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null);
 const [help,setHelp]=useState(false);
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
 useEffect(()=>{
  const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
  const done=()=>{setInstalled(true);setPrompt(null);setHelp(false);};
  window.addEventListener('beforeinstallprompt',ready);
  window.addEventListener('appinstalled',done);
  return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done);};
 },[]);
 async function install(){
  if(!prompt){setHelp(true);return;}
  try{await prompt.prompt();await prompt.userChoice;}catch{setHelp(true);}
  finally{setPrompt(null);}
 }
 return <><button className="secondary install-button" aria-label={installed?'App installed':'Install app'} onClick={install} disabled={installed}>{installed?<Check size={16}/>:<Download size={16}/>}<span>{installed?'Installed':'Install app'}</span></button>
 {help&&<Modal label="Install SmartSched" onClose={()=>setHelp(false)}><div className="section-heading"><h2>Keep your schedule close</h2><button className="icon-button" aria-label="Close install instructions" onClick={()=>setHelp(false)}><X size={20}/></button></div><p className="section-description">Install SmartSched for an app-like window and offline access to your saved classes.</p><div className="install-instructions"><section><Smartphone size={21}/><div><h3>iPhone & iPad</h3><p>Open in Safari, tap <Share size={13}/> Share, then <strong>Add to Home Screen</strong>. Enable “Open as Web App” if shown.</p></div></section><section><Smartphone size={21}/><div><h3>Android</h3><p>Open in Chrome, then use the browser menu → <strong>Add to home screen</strong> or <strong>Install app</strong>.</p></div></section><section><Monitor size={21}/><div><h3>Desktop</h3><p>In Chrome or Edge, use the install icon in the address bar or the browser’s <strong>Install app</strong> menu. On supported Safari versions, choose <strong>File → Add to Dock</strong>.</p></div></section></div><p className="note">Installation requires HTTPS or localhost and a supporting browser. Load the app online once before using it offline.</p></Modal>}</>;
}
