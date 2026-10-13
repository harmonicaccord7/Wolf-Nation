import Link from 'next/link'
import { getResearchIdentity } from '../../../lib/data/content'
import { NewsletterStudioPanel } from '../../../components/NewsletterStudioPanel'

export default async function NewsletterEditorPage() {
  const identity = await getResearchIdentity()
  if (!identity.authorized) return <main className="studio-shell"><section className="studio-lock">
    <p className="eyebrow">KAPORAL MARKET LETTER</p>
    <h1>Private newsletter editorial desk</h1>
    <p>Sign in with an approved researcher, editor or administrator account. Only editors and administrators can approve or publish an edition.</p>
    <div className="lockActions"><Link href="/auth">Sign in</Link><Link href="/newsletter">Public newsletter archive</Link></div>
  </section></main>
  const canEdit = ['editor', 'admin'].includes(identity.profile.role)
  return <main className="studio-shell">
    <header className="studio-head"><div><p className="eyebrow">KAPORAL MARKET LETTER</p><h1>Newsletter editions</h1>
      <p>{identity.profile.display_name ?? 'Researcher'} · {identity.profile.role}</p></div>
      <div className="workspaceActions"><Link href="/studio">← Command center</Link><Link href="/newsletter">Public archive ↗</Link></div>
    </header>
    <NewsletterStudioPanel canEdit={canEdit}/>
  </main>
}
