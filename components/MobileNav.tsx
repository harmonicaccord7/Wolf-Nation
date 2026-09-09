'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { primaryNav } from '../lib/navigation'

export function MobileNav(){
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    if(!open) return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=(event:KeyboardEvent)=>{ if(event.key==='Escape') setOpen(false) }
    window.addEventListener('keydown',onKey)
    return ()=>{ document.body.style.overflow=previous; window.removeEventListener('keydown',onKey) }
  },[open])

  const close=()=>setOpen(false)

  return <div className="mobileNav">
    <button className="mobileMenuButton" type="button" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-navigation" onClick={()=>setOpen(true)}>
      <span aria-hidden="true">☰</span><span>Menu</span>
    </button>
    {open&&<div className="mobileNavOverlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget) close()}}>
      <section className="mobileNavPanel" id="mobile-navigation" aria-label="Mobile navigation">
        <div className="mobileNavHead"><strong>KAPORAL INTELLIGENCE</strong><button type="button" aria-label="Close navigation" onClick={close}>×</button></div>
        <nav aria-label="Primary mobile navigation">{primaryNav.map(item=><Link key={item.href} href={item.href} onClick={close}>{item.label}<span aria-hidden="true">→</span></Link>)}</nav>
        <div className="mobileNavUtilities"><Link href="/search" onClick={close}>Search</Link><Link href="/contact" onClick={close}>Contact & support</Link><Link href="/auth" onClick={close}>Sign in</Link><Link className="mobileJoin" href="/auth" onClick={close}>Join free</Link></div>
        <p>Independent financial-market research and education. Not personalized financial advice.</p>
      </section>
    </div>}
  </div>
}
