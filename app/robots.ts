import type { MetadataRoute } from 'next'

export default function robots():MetadataRoute.Robots{
 const base='https://www.kaporalintelligence.com'
 return {rules:[{userAgent:'*',allow:'/',disallow:['/studio','/api/studio','/auth']}],sitemap:`${base}/sitemap.xml`,host:base}
}
