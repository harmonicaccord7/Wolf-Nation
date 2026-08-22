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
        <span className="brandLogoFrame brandLogoFrameLight" aria-hidden="true">
          <svg className="brandLogo brandLogoTransparent" viewBox="0 0 219 242" role="presentation" focusable="false">
            <defs>
              <filter id="kaporalRemoveDarkBackground" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  5 5 5 0 -1" />
              </filter>
            </defs>
            <image href="/brand/kaporal-intelligence-logo.svg?v=20260822-svg2" width="219" height="242" preserveAspectRatio="xMidYMid meet" filter="url(#kaporalRemoveDarkBackground)" />
          </svg>
        </span>
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
