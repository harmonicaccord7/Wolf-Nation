import type { MetadataRoute } from 'next'

export default function manifest():MetadataRoute.Manifest{
 return {
  name:'KAPORAL INTELLIGENCE',
  short_name:'KAPORAL',
  description:'Independent global intelligence for markets, crypto, macro, options, Africa, business and technology.',
  start_url:'/',
  display:'standalone',
  background_color:'#07111f',
  theme_color:'#07111f',
  orientation:'any',
  categories:['finance','business','education','news'],
  icons:[
   {src:'/brand/kaporal-intelligence-logo.png',sizes:'512x512',type:'image/png'},
   {src:'/brand/kaporal-intelligence-logo.svg',sizes:'any',type:'image/svg+xml'}
  ]
 }
}
