import type { NextConfig } from 'next'

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'}
]
const stateHeaders=[{key:'Cache-Control',value:'no-store, max-age=0, must-revalidate'}]

const nextConfig:NextConfig={
  poweredByHeader:false,
  async headers(){return [
    {source:'/:path*',headers:securityHeaders},
    {source:'/auth/:path*',headers:stateHeaders},
    {source:'/newsletter/:path*',headers:stateHeaders},
    {source:'/api/newsletter/:path*',headers:stateHeaders},
    {source:'/api/contact',headers:stateHeaders}
  ]}
}

export default nextConfig
