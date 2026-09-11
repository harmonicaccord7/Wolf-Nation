import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const appDir=path.join(root,'app')
const errors=[]
const warnings=[]

const requiredPublicRoutes=['/','/markets','/events','/newsletter','/bitcoin','/crypto','/macro','/options','/africa','/business','/technology','/learn','/research','/track-record','/impact-map','/status','/about','/methodology','/contact','/disclosures','/corrections','/privacy','/terms']
const requiredPrivateRoutes=['/auth','/auth/confirm','/account','/studio','/studio/signals','/newsletter/confirm','/newsletter/unsubscribe']

function segments(route){return route.split('?')[0].split('#')[0].split('/').filter(Boolean)}
function routeExists(route){
  const parts=segments(route)
  if(parts.length===0)return fs.existsSync(path.join(appDir,'page.tsx'))
  let candidates=[appDir]
  for(const part of parts){
    const next=[]
    for(const base of candidates){
      if(!fs.existsSync(base))continue
      const exact=path.join(base,part)
      if(fs.existsSync(exact)&&fs.statSync(exact).isDirectory())next.push(exact)
      for(const entry of fs.readdirSync(base,{withFileTypes:true})){
        if(entry.isDirectory()&&/^\[.*\]$/.test(entry.name))next.push(path.join(base,entry.name))
      }
    }
    candidates=next
    if(!candidates.length)return false
  }
  return candidates.some(dir=>fs.existsSync(path.join(dir,'page.tsx'))||fs.existsSync(path.join(dir,'route.ts')))
}

for(const route of [...requiredPublicRoutes,...requiredPrivateRoutes])if(!routeExists(route))errors.push(`Missing required route: ${route}`)

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name)
    if(entry.isDirectory())walk(full,out)
    else if(/\.(ts|tsx|js|jsx)$/.test(entry.name))out.push(full)
  }
  return out
}

const sourceFiles=[...walk(path.join(root,'app')),...walk(path.join(root,'components')),...walk(path.join(root,'lib')),path.join(root,'proxy.ts'),path.join(root,'next.config.ts')].filter(fs.existsSync)
let hrefCount=0
const seenBroken=new Set()
for(const file of sourceFiles){
  const text=fs.readFileSync(file,'utf8')
  if(/https?:\/\/(localhost|127\.0\.0\.1):3000/i.test(text))errors.push(`Production source contains localhost redirect: ${path.relative(root,file)}`)
  const regexes=[/\bhref\s*=\s*["']([^"']+)["']/g,/\bhref\s*:\s*["']([^"']+)["']/g]
  for(const re of regexes){
    for(const match of text.matchAll(re)){
      const href=match[1]
      if(!href.startsWith('/')||href.startsWith('//')||href.includes('${'))continue
      hrefCount++
      const route=href.split('#')[0].split('?')[0]||'/'
      if(route.startsWith('/api/'))continue
      if(!routeExists(route)){
        const key=`${href}|${path.relative(root,file)}`
        if(!seenBroken.has(key)){seenBroken.add(key);errors.push(`Broken static internal href ${href} in ${path.relative(root,file)}`)}
      }
    }
  }
}

const sitemap=fs.readFileSync(path.join(appDir,'sitemap.ts'),'utf8')
const robots=fs.readFileSync(path.join(appDir,'robots.ts'),'utf8')
const layout=fs.readFileSync(path.join(appDir,'layout.tsx'),'utf8')
for(const route of requiredPublicRoutes.filter(r=>r!=='/'))if(!sitemap.includes(`'${route}'`))errors.push(`Public route absent from sitemap source: ${route}`)
for(const [name,text] of [['sitemap',sitemap],['robots',robots],['layout metadata',layout]])if(!text.includes('https://www.kaporalintelligence.com'))errors.push(`${name} does not reference canonical production host`)
if(!robots.includes('/api'))warnings.push('robots.ts does not explicitly disallow /api paths')
if(!robots.includes('/account'))warnings.push('robots.ts does not explicitly disallow /account paths')
if(!robots.includes('/newsletter/confirm'))warnings.push('robots.ts does not explicitly disallow newsletter confirmation URLs')

if(errors.length){console.error('\nKAPORAL launch QA failed:\n- '+errors.join('\n- '));process.exit(1)}
console.log(`KAPORAL launch QA passed: ${requiredPublicRoutes.length} public routes, ${requiredPrivateRoutes.length} private/transactional routes, ${hrefCount} static internal links checked.`)
if(warnings.length)console.warn('Warnings:\n- '+warnings.join('\n- '))
