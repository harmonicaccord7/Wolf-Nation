import Link from 'next/link'

const nav = ['Markets','Bitcoin','Crypto','Macro','Options','Africa','Business','Technology','Learn','Research']

export function Header(){
  return <>
    <div className="disclaimer">
      <b>Independent research & education — not financial advice.</b>
      <span> Verify information and your own circumstances before acting.</span>
      <a href="#methodology">Methodology</a>
    </div>
    <header className="header shell">
      <Link className="brand" href="/" aria-label="KAPORAL INTELLIGENCE home">
        <img className="brandLogo" src="/brand/kaporal-intelligence-logo.png" alt="KAPORAL INTELLIGENCE" />
        <span><strong>KAPORAL</strong><small>INTELLIGENCE</small></span>
      </Link>
      <nav>{nav.map(n=><a key={n} href={`#${n.toLowerCase()}`}>{n}</a>)}</nav>
      <div className="actions">
        <button className="iconButton" aria-label="Search">⌕</button>
        <Link className="outlineButton" href="/auth">Sign in</Link>
        <Link className="goldButton" href="/auth">Join free</Link>
      </div>
    </header>
  </>
}
