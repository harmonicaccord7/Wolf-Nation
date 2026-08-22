import { NextResponse } from 'next/server'
import { getOverviewIntelligence } from '../../../../lib/data/intelligence'
export const dynamic='force-dynamic'
export async function GET(){try{return NextResponse.json(await getOverviewIntelligence())}catch{return NextResponse.json({error:'Verified intelligence layer temporarily unavailable.'},{status:503})}}
