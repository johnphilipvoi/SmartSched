import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import WidgetView from './WidgetView';
import ErrorBoundary from './ErrorBoundary';
import './style.css';
import {registerSW} from 'virtual:pwa-register';
registerSW({immediate:true});
const isWidget=new URLSearchParams(window.location.search).get('widget')==='1';
if(isWidget){
 document.title='SmartSched · Schedule Widget';
 if(!document.querySelector('link[rel="manifest"]')){
  const link=document.createElement('link');link.rel='manifest';document.head.appendChild(link);
 }
 document.querySelectorAll('link[rel="manifest"]').forEach(link=>link.setAttribute('href','/widget.webmanifest'));
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary>{isWidget?<WidgetView/>:<App/>}</ErrorBoundary></React.StrictMode>);
