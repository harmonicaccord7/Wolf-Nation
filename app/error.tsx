'use client'
import Link from 'next/link'

export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="errorScreen"><div><p className="eyebrow">KAPORAL INTELLIGENCE</p><h1>This intelligence view could not be loaded.</h1><p>The underlying data or application route may be temporarily unavailable. We do not substitute fabricated values when a verified feed fails.</p><div className="heroButtons"><button className="goldButton" onClick={()=>reset()}>Try again</button><Link className="outlineButton" href="/">Return home</Link></div></div></main>
}
