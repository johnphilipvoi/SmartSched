import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),tailwindcss(),VitePWA({
 registerType:'autoUpdate',
  includeAssets:['icons/logo.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'],
 manifest:{
  id:'/',name:'SmartSched — Student Schedule',short_name:'SmartSched',
   description:'Your private class timetable and daily schedule',
  theme_color:'#087f70',background_color:'#f5f7f9',display:'standalone',
  scope:'/',start_url:'/',categories:['education','productivity'],
  shortcuts:[
   {name:'Today',short_name:'Today',url:'/?view=today'},
    {name:'Import schedule',short_name:'Import',url:'/?import=1'}
  ],
  icons:[
    {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
    {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
    {src:'/icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
  ]
 },
 workbox:{
  importScripts:['notification-sw.js'],
  globPatterns:['**/*.{js,mjs,css,html,svg,png,woff2,webmanifest}'],
  navigateFallback:'index.html',
  runtimeCaching:[{
   urlPattern:({url})=>url.hostname==='cdn.jsdelivr.net'||url.hostname==='tessdata.projectnaptha.com',
   handler:'CacheFirst',
   options:{cacheName:'smartsched-ocr-assets',expiration:{maxEntries:30,maxAgeSeconds:60*60*24*90},cacheableResponse:{statuses:[0,200]}}
  }]
 }
})],build:{
 // ExcelJS is one prebuilt ~940 kB browser bundle. It is already behind a
 // dynamic import, so it is only fetched after someone chooses an .xlsx file.
 // The app shell stays around 430 kB and PDF.js around 458 kB. Set the limit
 // above the known import-only vendor chunk so the warning signals real
 // regressions in first-load code instead of this expected lazy bundle.
 chunkSizeWarningLimit:1000
}});
