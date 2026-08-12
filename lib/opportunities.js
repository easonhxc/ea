import opportunities from "@/data/opportunities.json";
import majors from "@/data/majors.json";

const majorMap=Object.fromEntries(majors.map(m=>[m.slug,m]));
function slug(text=""){return String(text).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}
function majorCategory(text=""){
  const s=slug(text);
  if(majorMap[s])return majorMap[s].category;
  if(s.includes("material")||s.includes("engineering"))return "engineering";
  if(s.includes("computer")||s.includes("data")||s.includes("ai"))return "computing";
  if(s.includes("business")||s.includes("finance")||s.includes("economic"))return "business";
  if(s.includes("history")||s.includes("english")||s.includes("philosophy"))return "humanities";
  if(s.includes("politic")||s.includes("psych")||s.includes("soci"))return "social";
  return "other";
}
function gradeNum(g){const n=Number(g);return Number.isFinite(n)?n:null}

export function matchOpportunities(profile,{kind="all",query="",limit=50}={}){
  const cat=majorCategory(profile.primary_major||"");
  const g=gradeNum(profile.current_grade);
  const q=query.toLowerCase().trim();
  const currentKinds=new Set((profile.activities||[]).map(a=>a.category));
  const scored=opportunities.filter(o=>kind==="all"||o.kind===kind).filter(o=>!q||`${o.name} ${o.provider} ${o.tags.join(" ")}`.toLowerCase().includes(q)).map(o=>{
    let score=48;
    if(o.tags.includes(cat))score+=18;
    if(cat==="engineering"&&o.tags.some(t=>["engineering","materials","research","environmental","robotics"].includes(t)))score+=12;
    if(cat==="computing"&&o.tags.some(t=>["computing","computer_science","artificial_intelligence","data_science"].includes(t)))score+=12;
    if(cat==="humanities"&&o.tags.some(t=>["humanities","writing","history","philosophy"].includes(t)))score+=12;
    if(cat==="social"&&o.tags.some(t=>["social","public_policy","political_science","international_relations"].includes(t)))score+=12;
    if(cat==="business"&&o.tags.some(t=>["business","finance","entrepreneurship"].includes(t)))score+=12;
    if(g&&o.grades?.length){if(o.grades.includes(g))score+=10;else score-=25}
    if(o.kind==="research"&&!currentKinds.has("research"))score+=7;
    if(o.kind==="competition"&&(profile.awards||[]).length<2)score+=5;
    if(o.kind==="project"&&(profile.distinctive_outputs||[]).length<2)score+=6;
    if(o.selectivity==="elite")score-=2; // avoid ranking only by prestige
    score=Math.max(0,Math.min(100,score));
    const reasons=[];
    if(o.tags.includes(cat)||score>=75)reasons.push(`Strong fit for ${profile.primary_major||cat}`);
    if(g&&o.grades?.includes(g))reasons.push(`Grade ${g} eligible in catalog`);
    if(o.kind==="research"&&!currentKinds.has("research"))reasons.push("Fills a research-depth gap");
    if(o.kind==="project")reasons.push("Can create a tangible output");
    return {...o,match_score:score,match_reasons:reasons.slice(0,3)};
  });
  return scored.sort((a,b)=>b.match_score-a.match_score||a.name.localeCompare(b.name)).slice(0,limit);
}

export function getOpportunity(id){return opportunities.find(o=>o.id===id)||null}
export function catalogStats(){return {total:opportunities.length,summer:opportunities.filter(o=>o.kind==="summer").length,research:opportunities.filter(o=>o.kind==="research").length,competition:opportunities.filter(o=>o.kind==="competition").length,project:opportunities.filter(o=>o.kind==="project").length}}
