import fs from "node:fs/promises";

const API="https://www.collegedata.fyi/api";
const OUT=new URL("../data/schools.json",import.meta.url);
const REPORT=new URL("../docs/CDS_COVERAGE.md",import.meta.url);
const WRITE=process.argv.includes("--write");
const CHECKED_AT=new Date().toISOString().slice(0,10);

const preferredName={
  Harvard:"Harvard University",MIT:"Massachusetts Institute of Technology",Stanford:"Stanford University",Princeton:"Princeton University",Yale:"Yale University",Caltech:"California Institute of Technology",Columbia:"Columbia University in the City of New York",UPenn:"University of Pennsylvania",UChicago:"University of Chicago","UC Berkeley":"University of California Berkeley",UCLA:"University of California Los Angeles",Michigan:"University of Michigan Ann Arbor",USC:"University of Southern California",NYU:"New York University",UVA:"University of Virginia Main Campus","UC San Diego":"University of California San Diego","UT Austin":"The University of Texas at Austin",Florida:"University of Florida","Georgia Tech":"Georgia Institute of Technology",UIUC:"University of Illinois Urbana Champaign",Purdue:"Purdue University Main Campus","Wisconsin–Madison":"University of Wisconsin Madison",Maryland:"University of Maryland College Park","Ohio State":"Ohio State University Main Campus","Penn State":"Pennsylvania State University Main Campus","Virginia Tech":"Virginia Polytechnic Institute and State University","Minnesota Twin Cities":"University of Minnesota Twin Cities","Texas A&M":"Texas A & M University College Station","Arizona State":"Arizona State University Campus Immersion",Rochester:"University of Rochester","UC Davis":"University of California Davis","UC Irvine":"University of California Irvine","UC Santa Barbara":"University of California Santa Barbara",WashU:"Washington University in St Louis",Tufts:"Tufts University","UNC Chapel Hill":"University of North Carolina at Chapel Hill","University of Washington":"University of Washington Seattle Campus","Rutgers–New Brunswick":"Rutgers University New Brunswick","Stony Brook":"Stony Brook University","UMass Amherst":"University of Massachusetts Amherst","Indiana Bloomington":"Indiana University Bloomington","Michigan State":"Michigan State University","Iowa State":"Iowa State University","Colorado School of Mines":"Colorado School of Mines","Rose-Hulman":"Rose Hulman Institute of Technology",RIT:"Rochester Institute of Technology",RPI:"Rensselaer Polytechnic Institute",WPI:"Worcester Polytechnic Institute",Drexel:"Drexel University","Santa Clara":"Santa Clara University","Stevens Institute of Technology":"Stevens Institute of Technology",Syracuse:"Syracuse University","George Washington":"George Washington University","American University":"American University",Fordham:"Fordham University",Pepperdine:"Pepperdine University","University of Miami":"University of Miami",Tulane:"Tulane University of Louisiana",Villanova:"Villanova University","NC State":"North Carolina State University at Raleigh",UConn:"University of Connecticut",Delaware:"University of Delaware",Pittsburgh:"University of Pittsburgh Pittsburgh Campus",Baylor:"Baylor University",Clemson:"Clemson University","Virginia Commonwealth":"Virginia Commonwealth University","Illinois Tech":"Illinois Institute of Technology","Williams College":"Williams College","Amherst College":"Amherst College","Swarthmore College":"Swarthmore College","Bowdoin College":"Bowdoin College","Claremont McKenna College":"Claremont McKenna College","Pomona College":"Pomona College","Carleton College":"Carleton College","Harvey Mudd College":"Harvey Mudd College","Davidson College":"Davidson College","Grinnell College":"Grinnell College","Hamilton College":"Hamilton College","Middlebury College":"Middlebury College","Vassar College":"Vassar College","Wesleyan University":"Wesleyan University","Washington and Lee University":"Washington and Lee University","Colgate University":"Colgate University","University of Richmond":"University of Richmond","Bates College":"Bates College","Colby College":"Colby College","Haverford College":"Haverford College","College of the Holy Cross":"College of the Holy Cross","Macalester College":"Macalester College","Bucknell University":"Bucknell University"
};
const heldBaseline={
  UCLA:[.09,"Built-in planning baseline; verify current official data."],Michigan:[.16,"Built-in planning baseline; verify current official data."],Florida:[.24,"Built-in planning baseline; verify current official data."],"Arizona State":[.9,"Built-in planning baseline; verify current official data."],"Boston University":[.14,"Built-in planning baseline; verify current official data."],"UC Davis":[.42,"Built-in planning baseline; verify current official data."],Vanderbilt:[.057,"Planning seed baseline. Verify current institutional and program-level data before making a final decision."],"UNC Chapel Hill":[.175,"Planning seed baseline. Verify current institutional and program-level data before making a final decision."],"UMass Amherst":[.58,"Planning seed baseline. Verify current institutional and program-level data before making a final decision."],Clemson:[.43,"Planning seed baseline. Verify current institutional and program-level data before making a final decision."],"Swarthmore College":[.077,"2026 liberal-arts planning baseline; verify current Common Data Set, admission policy and exact major catalog before applying."]
};

const meaningfulKeys=new Set([
  "applied","admitted","enrolled_first_year","acceptance_rate","yield_rate",
  "sat_composite_p50","act_composite_p50","sat_submit_rate","act_submit_rate",
  "ed_offered","ed_applicants","ed_admitted","ea_offered","wait_list_offered",
  "non_need_aid_share_first_year_ft","avg_non_need_grant_first_year_ft"
]);

const normalize=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
const tokens=s=>new Set(normalize(s).split(" ").filter(x=>x&&!new Set(["the","of","at","main","campus"]).has(x)));
function matchScore(target,result){
  const a=tokens(target),b=tokens(result.school_name);let hit=0;for(const x of a)if(b.has(x))hit++;
  const union=new Set([...a,...b]).size||1;
  return hit/union+(normalize(target)===normalize(result.school_name)?2:0);
}
async function getJson(url,retries=3){
  let error;
  for(let i=0;i<retries;i++)try{
    const r=await fetch(url,{headers:{"User-Agent":"UniPath-CDS-Updater/1.0"},signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  }catch(e){error=e;await new Promise(r=>setTimeout(r,500*(i+1)))}
  throw error;
}
async function pool(items,limit,work){
  const out=new Array(items.length);let next=0;
  async function worker(){while(next<items.length){const i=next++;try{out[i]=await work(items[i],i)}catch(error){out[i]={error:String(error?.message||error)}}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;
}
function compactFact(f){return {value:f.value,display_value:f.display_value,unit:f.unit,field_ids:f.source?.field_ids||[],quality:f.quality?.flag||"reported",note:f.quality?.note||null}}

const schools=JSON.parse(await fs.readFile(OUT,"utf8"));
const usSchools=schools.filter(s=>s.country==="us");
const matches=await pool(usSchools,6,async school=>{
  const target=preferredName[school.name]||school.name;
  const found=await getJson(`${API}/schools/search?q=${encodeURIComponent(target)}&limit=10`);
  const candidates=found.results||[];const best=[...candidates].sort((a,b)=>matchScore(target,b)-matchScore(target,a))[0];
  return {name:school.name,target,best,score:best?matchScore(target,best):0,candidates:candidates.slice(0,3)};
});

const resolved=matches.filter(x=>x.best&&x.score>=.32&&!x.error);
const details=await pool(resolved,6,async match=>{
  const [facts,sources]=await Promise.all([
    getJson(`${API}/schools/${encodeURIComponent(match.best.school_id)}/facts?categories=admissions,enrollment,aid,sources`),
    getJson(`${API}/schools/${encodeURIComponent(match.best.school_id)}/sources`)
  ]);
  const docs=(sources.cds_documents||[]).filter(d=>!d.removed_at).sort((a,b)=>String(b.canonical_year).localeCompare(String(a.canonical_year)));
  const latest=docs[0]||null;const trustedYear=/^\d{4}-\d{2}$/.test(latest?.canonical_year||"");const values={};
  for(const fact of facts.facts||[]){
    if(!meaningfulKeys.has(fact.key)||fact.value==null||fact.source?.layer!=="cds")continue;
    if(latest?.canonical_year&&fact.source.canonical_year!==latest.canonical_year)continue;
    if(!["reported","derived"].includes(fact.quality?.flag))continue;
    values[fact.key]=compactFact(fact);
  }
  if(values.applied?.value>0&&values.admitted?.value>=0){
    values.acceptance_rate={value:values.admitted.value/values.applied.value,display_value:`${(values.admitted.value/values.applied.value*100).toFixed(1)}%`,unit:"percent",field_ids:[...new Set([...(values.applied.field_ids||[]),...(values.admitted.field_ids||[])])],quality:"derived",note:"Derived from CDS first-year admitted ÷ applied."};
  }
  if(values.admitted?.value>0&&values.enrolled_first_year?.value>=0){
    values.yield_rate={value:values.enrolled_first_year.value/values.admitted.value,display_value:`${(values.enrolled_first_year.value/values.admitted.value*100).toFixed(1)}%`,unit:"percent",field_ids:[...new Set([...(values.admitted.field_ids||[]),...(values.enrolled_first_year.field_ids||[])])],quality:"derived",note:"Derived from CDS first-year enrolled ÷ admitted."};
  }
  return {match,coverage:sources.coverage||null,latest,values:trustedYear?values:{},trustedYear};
});

const detailMap=new Map(details.filter(x=>!x.error).map(x=>[x.match.name,x]));
for(const school of schools){
  if(school.country!=="us")continue;
  const d=detailMap.get(school.name);
  if(!d){school.cds={status:"not_found",checked_at:CHECKED_AT};continue}
  const hasDoc=!!d.latest;
  school.cds={
    status:hasDoc?(d.trustedYear?"available":"needs_review"):"not_found",
    school_id:d.match.best.school_id,
    institution_name:d.match.best.school_name,
    ipeds_id:d.match.best.ipeds_id||null,
    coverage_status:d.coverage?.status||d.match.best.coverage_status||null,
    year:d.latest?.canonical_year||null,
    source_url:d.latest?.source_url||null,
    archived_source_url:d.latest?.archived_source_url||null,
    archive_page_url:d.latest?.archive_page_url||null,
    source_format:d.latest?.source_format||null,
    last_verified_at:d.latest?.last_verified_at||d.coverage?.last_checked_at||null,
    checked_at:CHECKED_AT,
    values:d.values
  };
  if(!d.trustedYear&&heldBaseline[school.name]){school.sel=heldBaseline[school.name][0];school.data_quality="seed";school.source_note=heldBaseline[school.name][1]}
  const rate=d.values.acceptance_rate?.value;
  if(Number.isFinite(rate)&&rate>0&&rate<1){school.sel=Number(rate.toFixed(5));school.data_quality="official_cds";school.source_note=`Official ${school.cds.year} Common Data Set: ${d.values.acceptance_rate.display_value} overall first-year admit rate.`}
}

const unmatched=usSchools.map(x=>x.name).filter(name=>!detailMap.has(name));
const available=schools.filter(s=>s.cds?.status==="available");
const needsReview=schools.filter(s=>s.cds?.status==="needs_review");
const withValues=available.filter(s=>Object.keys(s.cds.values||{}).length);
const updatedRates=schools.filter(s=>s.data_quality==="official_cds");
const report=[
  "# Common Data Set coverage",
  "",
  `Generated: ${CHECKED_AT}`,
  "",
  "UniPath uses school-published Common Data Set documents for U.S. institutions. The discovery API is used only as a source index and extraction layer; every stored record retains the school's original CDS URL, document year, CDS field identifiers, extraction quality, and verification timestamp.",
  "",
  `- U.S. schools in catalog: ${usSchools.length}`,
  `- Official CDS documents located: ${available.length}`,
  `- CDS documents with usable structured values: ${withValues.length}`,
  `- Baseline admit rates updated from CDS counts: ${updatedRates.length}`,
  `- Documents held for year/source review: ${needsReview.length}`,
  `- No CDS match/document found: ${unmatched.length}`,
  "",
  "## Data rules",
  "",
  "- Only values whose provenance layer is `cds` and whose extraction quality is `reported` or `derived` are stored.",
  "- Acceptance rate is recalculated only when the same CDS supplies both total first-year applicants and admits.",
  "- Yield is recalculated only when the same CDS supplies admits and enrolled first-year students.",
  "- Missing values remain missing. IPEDS and College Scorecard figures are not copied into the CDS object.",
  "- Documents without a canonical academic year are retained as `needs_review`; their extracted values do not update the catalog.",
  "- Non-U.S. school records are left byte-for-byte equivalent at the object-data level and receive no CDS fields.",
  "",
  "## Schools without a resolved CDS",
  "",
  ...(unmatched.length?unmatched.map(x=>`- ${x}`):["- None"]),
  ""
].join("\n");

console.log(JSON.stringify({us:usSchools.length,resolved:resolved.length,available:available.length,needsReview:needsReview.map(x=>x.name),withValues:withValues.length,updatedRates:updatedRates.length,unmatched,reviewMatches:matches.filter(x=>x.best&&x.score<1).map(x=>({name:x.name,target:x.target,candidate:x.best.school_name,school_id:x.best.school_id,score:Number(x.score.toFixed(3))}))},null,2));
if(WRITE){await fs.writeFile(OUT,JSON.stringify(schools,null,2)+"\n");await fs.writeFile(REPORT,report)}
