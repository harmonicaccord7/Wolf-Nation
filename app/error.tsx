'use client'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('KAPORAL application error',error)},[error])
 return <main className="errorShell"><section><span className="eyebrow">APPLICATION ERROR</span><h1>KAPORAL could not render this view.</h1><p>The underlying data has not been replaced with a fallback estimate. Retry the request or return to the public intelligence home.</p><div className="deskHeroActions"><button className="goldButton" type="button" onClick={reset}>Try again</button><Link className="glassButton" href="/">Return home</Link></div>{error.digest&&<small>Reference: {error.digest}</small>}</section></main>
}
