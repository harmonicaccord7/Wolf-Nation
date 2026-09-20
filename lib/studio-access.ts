import { NextResponse } from 'next/server'
import { createClient } from './supabase/server'
export const noStore = { 'cache-control': 'no-store' }
export const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore })
export async function studioAccess() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { db, user: null, role: null, error: reply({ error: 'Authentication required' }, 401) }
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '')
  if (!['researcher', 'editor', 'admin'].includes(role)) return { db, user, role, error: reply({ error: 'Research staff access required' }, 403) }
  return { db, user, role, error: null }
}
