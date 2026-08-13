import { resolveMajor } from "@/lib/major-resolver";
import fitProfiles from "@/data/major-fit-profiles.json";

const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const DIMS=["physics","chemistry","biology","mathematics","computation","engineering_design","materials","environment","writing_humanities","social_science","entrepreneurship","service","creative"];
const MATCH={
  physics:/physics|mechanic|energy|thermo|aero|force|物理|力学|能源|热力/,
  chemistry:/chem|polymer|adsorp|carbonization|cataly|reaction|化学|聚合物|吸附|碳化|催化/,
  biology:/bio|health|medical|diabetic|plant|biology|neuro|genetic|生物|医疗|糖尿病|植物|神经|基因/,
  mathematics:/math|model|simulation|optimization|quantitative|statistics|calculus|数学|建模|模拟|优化|统计|微积分/,
  computation:/ai\b|machine learning|code|software|data|algorithm|hyrcan|plaxis|python|计算|算法|数据|机器学习|编程/,
  engineering_design:/engineer|prototype|cad|3d print|device|robot|hardware|insole|typewriter|geotextile|circuit|工程|原型|设计|装置|硬件|鞋垫|打字机|土工|电路/,
  materials:/material|polymer|lattice|fiber|hydrogel|composite|geotextile|metal|alloy|材料|聚合物|晶格|纤维|水凝胶|复合|金属|合金/,
  environment:/environment|sustain|water|waste|carbon|slope|tea|energy|climate|pollution|环境|可持续|废水|废弃|碳|边坡|茶|能源|气候|污染/,
  writing_humanities:/documentary|writing|essay|history|identity|film|journal|literature|ethic|philosoph|纪录片|写作|历史|身份|人文|伦理|哲学|文学/,
  social_science:/survey|economics|sociology|policy|community|politic|public|社会|经济|调查|政策|社区|政治|公共/,
  entrepreneurship:/business|startup|founder|market|venture|product|商业|创业|市场|产品/,
  service:/volunteer|service|blind|community|public benefit|公益|志愿|视障|陪跑|社区|服务/,
  creative:/film|photo|music|design|art|documentary|story|创作|摄影|音乐|艺术|纪录片|设计/
};
const REQ={
  materials_engineering:{materials:1,chemistry:.9,physics:.8,engineering_design:.82,mathematics:.62,computation:.45,environment:.38},
  environmental_engineering:{environment:1,chemistry:.85,engineering_design:.78,biology:.6,mathematics:.58,computation:.45,materials:.42,social_science:.35,service:.25},
  mechanical_engineering:{engineering_design:1,physics:1,mathematics:.75,computation:.58,materials:.5},
  chemical_engineering:{chemistry:1,mathematics:.75,physics:.6,engineering_design:.75,environment:.35,biology:.25},
  bioengineering:{biology:1,engineering_design:.85,chemistry:.72,mathematics:.55,computation:.55,service:.28},
  biomedical_engineering:{biology:1,engineering_design:.88,chemistry:.7,mathematics:.58,computation:.58,service:.32},
  civil_engineering:{engineering_design:1,physics:.8,mathematics:.65,materials:.65,environment:.55,social_science:.25},
  energy_engineering:{physics:.9,engineering_design:.85,environment:.75,mathematics:.65,chemistry:.5,materials:.5,computation:.4},
  electrical_engineering:{physics:.9,mathematics:.85,computation:.75,engineering_design:.85},
  computer_science:{computation:1,mathematics:.78,engineering_design:.48},
  artificial_intelligence:{computation:1,mathematics:.85,social_science:.25,writing_humanities:.18},
  data_science:{computation:.9,mathematics:.8,social_science:.25},
  economics:{social_science:.92,mathematics:.7,writing_humanities:.58,computation:.35,entrepreneurship:.25},
  political_science:{social_science:1,writing_humanities:.85,service:.38,mathematics:.2},
  ppe:{social_science:1,writing_humanities:1,mathematics:.45,entrepreneurship:.25,service:.28},
  history:{writing_humanities:1,social_science:.62,creative:.25},
  science_technology_society:{writing_humanities:.85,social_science:.9,engineering_design:.4,computation:.3,service:.3},
  environmental_studies:{environment:1,social_science:.8,writing_humanities:.65,biology:.4,chemistry:.35,service:.4},
  sustainability:{environment:1,social_science:.78,writing_humanities:.55,engineering_design:.5,entrepreneurship:.35,service:.4}
};
function reqFor(major){
  const r=resolveMajor(major);if(REQ[r.slug])return REQ[r.slug];
  if(r.category==="engineering")return {engineering_design:1,physics:.72,mathematics:.62,computation:.42,materials:.28,environment:.2};
  if(r.category==="computing")return REQ.computer_science;
  if(r.category==="natural")return {mathematics:.55,physics:.5,chemistry:.5,biology:.5,computation:.3};
  if(r.category==="life")return {biology:1,chemistry:.7,mathematics:.35,computation:.3,service:.25};
  if(r.category==="humanities")return {writing_humanities:1,creative:.45,social_science:.45};
  if(r.category==="social")return {social_science:1,writing_humanities:.72,mathematics:.28,service:.28};
  if(r.category==="business")return {entrepreneurship:.72,social_science:.7,mathematics:.45,writing_humanities:.5};
  if(r.category==="arts")return {creative:1,writing_humanities:.4,engineering_design:.22};
  if(r.category==="agriculture")return {biology:.85,chemistry:.55,environment:.7,engineering_design:.35,service:.25};
  return {engineering_design:.25,social_science:.25,writing_humanities:.25};
}
function fitProfile(major){
  const r=resolveMajor(major);return fitProfiles.majors[r.slug]||fitProfiles.category_defaults[r.category]||fitProfiles.category_defaults.other;
}
function vectorFor(a){
  const hay=`${a.name||""} ${a.description||""} ${a.measurable_outcome||""} ${a.role||""}`.toLowerCase();const v={};
  for(const d of DIMS)v[d]=MATCH[d].test(hay)?1:0;
  if(a.category==="research")v.mathematics=Math.max(v.mathematics,.22);
  if(a.category==="service")v.service=1;if(a.category==="arts")v.creative=1;if(a.category==="social_science")v.social_science=1;
  return v;
}
function evidenceQuality(a){
  const status=a.status==="planned"?.10:a.status==="unknown"?.48:1;
  let q=status;
  if(a.measurable_outcome?.trim())q*=1.10;
  if((a.description||"").length>=100)q*=1.04;
  if(/founder|president|lead|captain|director|creator|principal|first author|创办|负责人|主席|队长|主导|作者/i.test(a.role||""))q*=1.07;
  if(["regional","national","international"].includes(a.impact_scope))q*=1.06;
  return Math.min(1,q);
}
export function evaluateEvidenceFit(profile,major){
  const req=reqFor(major),meta=fitProfile(major),best=Object.fromEntries(DIMS.map(d=>[d,0]));let executed=0;const details=[];
  for(const a of profile.activities||[]){
    const v=vectorFor(a),strength=evidenceQuality(a);if(a.status!=="planned"&&a.status!=="unknown")executed++;
    for(const d of DIMS)best[d]=Math.max(best[d],v[d]*strength);
    details.push({name:a.name,status:a.status,role:a.role||null,scope:a.impact_scope||"unknown",evidence:DIMS.filter(d=>v[d]>.4),quality:Math.round(strength*100),outcome:a.measurable_outcome||null});
  }
  let den=0,got=0;for(const [d,w]of Object.entries(req)){den+=w;got+=w*(best[d]||0)}const alignment=den?100*got/den:60;
  const strongDims=Object.entries(best).filter(([,v])=>v>=.62).map(([k])=>k);
  const technical=(meta.technical_dimensions||[]).reduce((s,d)=>s+(best[d]||0),0)/Math.max(1,(meta.technical_dimensions||[]).length);
  const bridge=(meta.bridge_dimensions||[]).reduce((s,d)=>s+(best[d]||0),0)/Math.max(1,(meta.bridge_dimensions||[]).length);
  const need=Number(meta.interdisciplinary_need)||.45;
  // Fields with a high interdisciplinary requirement need BOTH a technical core and bridge evidence;
  // unrelated breadth cannot substitute for a weak technical foundation.
  const integrated=Math.min(technical,bridge)*.58+(technical*bridge)*.42;
  const interdisciplinary=clamp(55+((1-need)*(technical-.55)+need*(integrated-.40))*70,35,98);
  const gaps=Object.entries(req).filter(([d,w])=>w>=.55&&(best[d]||0)<.35).map(([d])=>d);
  const bridgeGaps=(meta.bridge_dimensions||[]).filter(d=>(best[d]||0)<.30).slice(0,3);
  const topDetails=details.filter(x=>x.status!=="planned").sort((a,b)=>b.quality-a.quality).slice(0,6);
  return {
    project_major_alignment:clamp(alignment),interdisciplinary_fit:interdisciplinary,interdisciplinary_need:Math.round(need*100),interdisciplinary_note:meta.note,
    project_evidence:clamp(43+executed*5+(profile.distinctive_outputs||[]).length*4),evidence_strengths:strongDims,evidence_gaps:gaps,bridge_gaps:bridgeGaps,
    technical_core_score:Math.round(technical*100),bridge_score:Math.round(bridge*100),details:topDetails
  };
}
