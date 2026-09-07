import opportunities from "@/data/opportunities.json";
import majors from "@/data/majors.json";

const majorMap=Object.fromEntries(majors.map(m=>[m.slug,m]));
const related={engineering:["materials","robotics","environmental","research","computing","natural"],computing:["computer_science","artificial_intelligence","data_science","research","engineering"],natural:["research","life","engineering","environmental"],life:["research","natural","public_health","environmental"],humanities:["writing","history","philosophy","research","journalism"],social:["public_policy","political_science","international_relations","research","writing"],business:["finance","entrepreneurship","economics","research"],arts:["writing","design","film","music","portfolio"],other:["research","project"]};
const clean=x=>String(x||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
const categoryFor=text=>{const key=clean(text);if(majorMap[key])return majorMap[key].category;return key.includes("engineer")?"engineering":key.includes("computer")||key.includes("data")||key==="ai"?"computing":key.includes("business")||key.includes("finance")||key.includes("economic")?"business":key.includes("history")||key.includes("english")||key.includes("philosophy")?"humanities":key.includes("politic")||key.includes("psych")||key.includes("soci")?"social":"other"};
const numberGrade=value=>Number.isFinite(Number(value))?Number(value):null;
const textOf=profile=>[...(profile.activities||[]).map(x=>`${x.name||""} ${x.description||""} ${x.category||""}`),...(profile.distinctive_outputs||[])].join(" ").toLowerCase();

function evidenceState(profile){
  const activities=(profile.activities||[]).filter(x=>x.status!=="planned");const text=textOf(profile);
  return {research:activities.some(x=>x.category==="research")||/research|研究|实验|survey|dataset|论文/.test(text),output:(profile.distinctive_outputs||[]).length>0||activities.some(x=>x.measurable_outcome),writing:/writing|journal|newspaper|essay|publication|写作|校报|文章/.test(text),service:activities.some(x=>x.category==="service"),currentKinds:new Set(activities.map(x=>x.category)),text};
}

function scoreOpportunity(opportunity,profile,category,state){
  const tags=opportunity.tags||[];const grade=numberGrade(profile.current_grade);let score=18;const reasons=[];const components={major:0,eligibility:0,gaps:0,feasibility:0,leverage:0,redundancy:0};
  if(tags.includes(category)){components.major=28;reasons.push(`Direct ${profile.primary_major||category} alignment`)}else {const hits=tags.filter(tag=>(related[category]||[]).includes(tag)).length;components.major=Math.min(20,hits*8);if(hits)reasons.push(`Supports a related ${category} evidence area`)}
  if(grade&&opportunity.grades?.length){if(opportunity.grades.includes(grade)){components.eligibility=18;reasons.push(`Catalog eligibility includes grade ${grade}`)}else components.eligibility=-32}else components.eligibility=7;
  if((opportunity.kind==="research"||tags.includes("research"))&&!state.research){components.gaps+=10;reasons.push("Fills a research-depth gap")}
  if((opportunity.kind==="project"||tags.includes("project"))&&!state.output){components.gaps+=9;reasons.push("Can produce a finished, documentable output")}
  if(opportunity.kind==="competition"&&(profile.awards||[]).filter(x=>x.status!=="planned").length<2)components.gaps+=5;
  if((tags.includes("writing")||tags.includes("journalism"))&&!state.writing)components.gaps+=5;
  if((tags.includes("service")||tags.includes("public_policy"))&&!state.service)components.gaps+=3;
  if(opportunity.cost==="free")components.feasibility+=8;else if(opportunity.cost==="need-based")components.feasibility+=5;else if(profile.aid_need==="high")components.feasibility-=8;
  if(opportunity.kind==="project")components.leverage+=8;else if(opportunity.kind==="research")components.leverage+=7;else if(opportunity.kind==="competition")components.leverage+=5;else components.leverage+=3;
  const repeatedKind=state.currentKinds.has(opportunity.kind)||(opportunity.kind==="summer"&&state.currentKinds.has("research")&&tags.includes("research"));const repeatedTags=tags.filter(tag=>state.text.includes(tag.replaceAll("_"," "))).length;
  if(repeatedKind)components.redundancy-=5;if(repeatedTags>=2)components.redundancy-=Math.min(8,repeatedTags*2);
  score+=Object.values(components).reduce((sum,n)=>sum+n,0);return {score:Math.max(0,Math.min(100,Math.round(score))),reasons,components};
}

function diversify(items,limit){
  const selected=[],kindCount=new Map(),remaining=[...items];while(selected.length<limit&&remaining.length){let bestIndex=0,bestScore=-Infinity;for(let i=0;i<remaining.length;i++){const item=remaining[i],adjusted=item.match_score-(kindCount.get(item.kind)||0)*6;if(adjusted>bestScore){bestScore=adjusted;bestIndex=i}}const [best]=remaining.splice(bestIndex,1);selected.push(best);kindCount.set(best.kind,(kindCount.get(best.kind)||0)+1)}return selected}

export function matchOpportunities(profile,{kind="all",query="",limit=50}={}){
  const category=categoryFor(profile.primary_major||"");const state=evidenceState(profile);const queryText=query.toLowerCase().trim();
  const ranked=opportunities.filter(o=>kind==="all"||o.kind===kind).filter(o=>!queryText||`${o.name} ${o.provider} ${(o.tags||[]).join(" ")}`.toLowerCase().includes(queryText)).map(opportunity=>{const result=scoreOpportunity(opportunity,profile,category,state);return {...opportunity,match_score:result.score,match_reasons:result.reasons.slice(0,3),score_breakdown:result.components};}).filter(o=>o.score_breakdown.eligibility>-30).sort((a,b)=>b.match_score-a.match_score||a.name.localeCompare(b.name));
  return diversify(ranked,Math.max(1,Math.min(100,Number(limit)||50)));
}

export function getOpportunity(id){return opportunities.find(o=>o.id===id)||null}
export function catalogStats(){return {total:opportunities.length,summer:opportunities.filter(o=>o.kind==="summer").length,research:opportunities.filter(o=>o.kind==="research").length,competition:opportunities.filter(o=>o.kind==="competition").length,project:opportunities.filter(o=>o.kind==="project").length}}
