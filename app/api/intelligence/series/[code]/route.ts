import {NextResponse} from 'next/server'
import {getChartSeries} from '../../../../../lib/data/chart-series'
import {isChartRange} from '../../../../../lib/data/chart'
export const dynamic='force-dynamic'
export async function GET(req:Request,{params}:{params:Promise<{code:string}>}){
 const {code}=await params,range=new URL(req.url).searchParams.get('range')??'1Y'
 if(!isChartRange(range))return NextResponse.json({error:'Invalid chart range'},{status:400})
 try{const data=await getChartSeries(code.toUpperCase(),range);return data?NextResponse.json(data):NextResponse.json({error:'Series not found'},{status:404})}catch{return NextResponse.json({error:'History temporarily unavailable'},{status:503})}
}
