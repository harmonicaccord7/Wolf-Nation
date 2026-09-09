import type { NextConfig } from 'next'

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'}
]

const noStore=[{key:'Cache-Control',value:'private, no-store, no-cache, max-age=0, must-revalidate'}]

const nextConfig:NextConfig={
  poweredByHeader:false,
  async headers(){return [
    {source:'/:path*',headers:securityHeaders},
    {source:'/auth/:path*',headers:noStore},
    {source:'/account/:path*',headers:noStore},
    {source:'/studio/:path*',headers:noStore},
    {source:'/newsletter/:path*',headers:noStore},
    {source:'/api/:path*',headers:noStore}
  ]}
}

export default nextConfig
