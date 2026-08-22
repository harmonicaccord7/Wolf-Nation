import { NextResponse } from 'next/server'
import { getSeriesHistory } from '../../../../../lib/data/intelligence'
export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{code:string}>}){const{code}=await params;const data=await getSeriesHistory(code.toUpperCase(),180);return data?NextResponse.json(data):NextResponse.json({error:'Series not found'},{status:404})}
