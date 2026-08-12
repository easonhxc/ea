"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { EmptyProfile } from "@/lib/schema";
import majors from "@/data/majors.json";
import schools from "@/data/schools.json";
import roundRules from "@/data/rounds.json";
import highSchools from "@/data/high-schools.json";

const NAV=[
  ["overview","Overview"],["profile","Profile"],["colleges","Colleges"],["opportunities","Opportunities"],
  ["roadmap","Roadmap"],["applications","Applications"],["advisor","AI Advisor"],["history","History"]
];
const COUNTRY_LABEL={us:"US",uk:"UK",canada:"Canada",singapore:"Singapore",hk:"Hong Kong",australia:"Australia",europe:"Europe"};
const roundLabel={ED1:"ED I",ED2:"ED II",EA:"EA",EA2:"EA2",REA:"REA",SCEA:"SCEA",RD:"RD",RA:"RA",UC:"UC",UCAS:"UCAS",OX:"Oxbridge",ROLLING:"Rolling"};
const pct=x=>`${Math.round((Number(x)||0)*100)}%`;
const score=x=>Number.isFinite(Number(x))?Math.round(Number(x)):"—";

function buildDraftPortfolio(predictions){
  const rows=predictions?.schools||[];
  if(!rows.length)return [];
  const selected=[];
  const take=(tier,n)=>{
    rows.filter(x=>x.tier===tier&&!selected.some(y=>y.school===x.school))
      .sort((a,b)=>(a.rank||999)-(b.rank||999)||b.probability-a.probability)
      .slice(0,n).forEach(x=>selected.push(x));
  };
  // A model-balanced starting point, not a claim about personal preference.
  take("Lottery",1); take("Super Reach",2); take("Reach",3); take("Target",3); take("Likely",2);
  if(selected.length<11){
    rows.filter(x=>!selected.some(y=>y.school===x.school))
      .sort((a,b)=>(a.rank||999)-(b.rank||999)||b.probability-a.probability)
      .slice(0,11-selected.length).forEach(x=>selected.push(x));
  }
  return selected.slice(0,12).map(row=>{
    const rule=roundRules[row.school]||{default:row.country==="uk"?"UCAS":"RD"};
    return {
      id:`draft-${row.school}`,draft:true,school_name:row.school,program:row.program,major:row.major,
      round:rule.default,probability:row.probability,probability_min:row.interval?.[0],probability_max:row.interval?.[1],
      tier:row.tier,status:"Planning",country:row.country,rank:row.rank
    };
  });
}

export default function Home(){
  const [supabase,setSupabase]=useState(null),[session,setSession]=useState(null),[authMode,setAuthMode]=useState("login");
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[authMsg,setAuthMsg]=useState("");
  const [tab,setTab]=useState("overview"),[profile,setProfile]=useState({...EmptyProfile}),[predictions,setPredictions]=useState(null);
  const [plans,setPlans]=useState([]),[opps,setOpps]=useState([]),[savedOpps,setSavedOpps]=useState([]),[roadmap,setRoadmap]=useState([]),[generatedRoadmap,setGeneratedRoadmap]=useState(null);
  const [chat,setChat]=useState([]),[question,setQuestion]=useState(""),[history,setHistory]=useState([]),[isAdmin,setIsAdmin]=useState(false),[adminData,setAdminData]=useState(null);
  const [loading,setLoading]=useState(""),[importText,setImportText]=useState(""),[feedback,setFeedback]=useState("");
  const [collegeCountry,setCollegeCountry]=useState("all"),[collegeTier,setCollegeTier]=useState("all"),[collegeQuery,setCollegeQuery]=useState("");
  const [oppKind,setOppKind]=useState("all"),[oppQuery,setOppQuery]=useState("");
  const [simulation,setSimulation]=useState(null),[strategy,setStrategy]=useState(null);
  const [adminSchool,setAdminSchool]=useState("Harvard"),[adminJson,setAdminJson]=useState('{\n  "sel": 0.035,\n  "source_note": "Verified current institutional source"\n}');

  useEffect(()=>{
    try{
      const s=getSupabaseBrowser();setSupabase(s);s.auth.getSession().then(({data})=>setSession(data.session));
      const {data:{subscription}}=s.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe();
    }catch(e){setAuthMsg(e.message)}
  },[]);
  useEffect(()=>{if(session)bootstrap()},[session]);
  useEffect(()=>{if(session&&tab==="opportunities"&&!opps.length)loadOpportunities()},[tab,session]);

  async function api(action,body={}){
    if(!session?.access_token)throw new Error("Please log in.");
    let res;
    try{
      res=await fetch("/api/unipath",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,...body})});
    }catch(e){
      throw new Error("Network request failed. Refresh the page and retry. If it repeats, check the latest Vercel runtime log.");
    }
    const raw=await res.text();let data={};
    try{data=raw?JSON.parse(raw):{}}catch{}
    if(!res.ok)throw new Error(data.error||raw||`Request failed (${res.status})`);
    return data;
  }
  async function bootstrap(){
    try{setLoading("bootstrap");const [me,p,pl,so,rm,ch,latest]=await Promise.all([api("me"),api("load_profile"),api("list_plans"),api("list_saved_opportunities"),api("list_roadmap"),api("chat_history"),api("latest_prediction")]);setIsAdmin(me.is_admin);if(p.profile)setProfile({...EmptyProfile,...p.profile});let loadedPlans=pl.plans||[];if(latest.predictions){setPredictions(latest.predictions);if(loadedPlans.length){try{const synced=await api("sync_plans",{predictions:latest.predictions});loadedPlans=synced.plans||loadedPlans}catch{}}}setPlans(loadedPlans);setSavedOpps(so.items||[]);setRoadmap(rm.items||[]);setChat((ch.messages||[]).map(m=>({role:m.role==="assistant"?"ai":"user",text:m.content})));}
    catch(e){alert(e.message)}finally{setLoading("")}
  }
  async function signIn(e){e.preventDefault();setAuthMsg("");try{if(!supabase)throw new Error("Supabase is not configured.");if(authMode==="signup"){const {error}=await supabase.auth.signUp({email,password});if(error)throw error;setAuthMsg("Account created. Check email if confirmation is enabled.")}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}}catch(e){setAuthMsg(e.message)}}
  async function logout(){await supabase?.auth.signOut();setSession(null)}
  const update=(k,v)=>setProfile(p=>({...p,[k]:v}));
  async function saveProfile(){try{setLoading("save");const d=await api("save_profile",{profile});setProfile({...EmptyProfile,...d.profile})}catch(e){alert(e.message)}finally{setLoading("")}}
  async function syncPlansWithPredictions(nextPredictions){
    if(!plans.length||!nextPredictions?.schools?.length)return;
    try{const d=await api("sync_plans",{predictions:nextPredictions});setPlans(d.plans||[]);setSimulation(null)}catch(e){console.warn("Plan sync failed",e)}
  }
  async function importProfile(){try{setLoading("import");const d=await api("analyze",{text:importText,age_band:profile.age_band,primary_major:profile.primary_major,secondary_major:profile.secondary_major});setProfile({...EmptyProfile,...d.profile});setPredictions(d.predictions);await syncPlansWithPredictions(d.predictions);setTab("colleges")}catch(e){alert(e.message)}finally{setLoading("")}}
  async function runPrediction(){try{setLoading("predict");const d=await api("predict",{profile,primary_major:profile.primary_major,secondary_major:profile.secondary_major,use_ai:true});setPredictions(d.predictions);await syncPlansWithPredictions(d.predictions);setTab("colleges")}catch(e){alert(e.message)}finally{setLoading("")}}
  async function addSchool(row){try{const rule=roundRules[row.school]||{default:row.country==="uk"?"UCAS":"RD"};const d=await api("save_plan",{plan:{school_name:row.school,program:row.program,major:row.major,round:rule.default,probability:row.probability,probability_min:row.interval[0],probability_max:row.interval[1],tier:row.tier,status:"Planning",country:row.country,rank:row.rank}});setPlans(p=>[...p.filter(x=>x.school_name!==row.school),d.plan]);setSimulation(null)}catch(e){alert(e.message)}}
  async function saveSuggestedPortfolio(draft){if(!draft?.length)return;try{setLoading("saveDraft");const d=await api("save_plan_batch",{plans:draft});setPlans(d.plans||[]);setSimulation(null)}catch(e){alert(e.message)}finally{setLoading("")}}
  async function changePlan(plan,patch){try{const d=await api("save_plan",{plan:{...plan,...patch}});setPlans(p=>p.map(x=>x.id===plan.id?d.plan:x));setSimulation(null)}catch(e){alert(e.message)}}
  async function deletePlan(plan){try{await api("delete_plan",{id:plan.id});setPlans(p=>p.filter(x=>x.id!==plan.id));setSimulation(null)}catch(e){alert(e.message)}}
  async function loadOpportunities(){try{setLoading("opps");const d=await api("opportunities",{profile,kind:oppKind,query:oppQuery,limit:80});setOpps(d.items||[])}catch(e){alert(e.message)}finally{setLoading("")}}
  async function saveOpportunity(o){try{const d=await api("save_opportunity",{opportunity_id:o.id});setSavedOpps(p=>[...p.filter(x=>x.opportunity_id!==o.id),d.item])}catch(e){alert(e.message)}}
  async function removeOpportunity(o){try{await api("delete_saved_opportunity",{opportunity_id:o.id});setSavedOpps(p=>p.filter(x=>x.opportunity_id!==o.id))}catch(e){alert(e.message)}}
  async function generateRoadmap(){try{setLoading("roadmap");const d=await api("generate_roadmap",{profile,predictions});setGeneratedRoadmap(d.roadmap)}catch(e){alert(e.message)}finally{setLoading("")}}
  async function acceptRoadmap(){if(!generatedRoadmap?.items?.length)return;try{setLoading("acceptRoadmap");const d=await api("accept_roadmap",{items:generatedRoadmap.items});setRoadmap(p=>[...p,...(d.items||[])]);setGeneratedRoadmap(null)}catch(e){alert(e.message)}finally{setLoading("")}}
  async function updateRoadmapItem(item,patch){try{const d=await api("save_roadmap_item",{item:{...item,...patch}});setRoadmap(p=>p.map(x=>x.id===item.id?d.item:x))}catch(e){alert(e.message)}}
  async function deleteRoadmapItem(item){try{await api("delete_roadmap_item",{id:item.id});setRoadmap(p=>p.filter(x=>x.id!==item.id))}catch(e){alert(e.message)}}
  async function askAI(){const q=question.trim();if(!q)return;setChat(c=>[...c,{role:"user",text:q}]);setQuestion("");try{setLoading("chat");const d=await api("counsel",{question:q,profile,predictions,plans});setChat(c=>[...c,{role:"ai",text:d.answer}])}catch(e){setChat(c=>[...c,{role:"ai",text:`Error: ${e.message}`}])}finally{setLoading("")}}
  async function clearChat(){try{await api("clear_chat");setChat([])}catch(e){alert(e.message)}}
  async function simulate(runs=2000,sourcePlans=plans){try{setLoading("simulate");const d=await api("simulate",{plans:sourcePlans,runs});setSimulation(d)}catch(e){alert(e.message)}finally{setLoading("")}}
  async function optimize(sourcePlans=plans){try{setLoading("strategy");setStrategy(await api("optimize_strategy",{plans:sourcePlans}))}catch(e){alert(e.message)}finally{setLoading("")}}
  async function loadHistory(){try{const d=await api("history");setHistory(d.runs||[]);setTab("history")}catch(e){alert(e.message)}}
  async function loadAdmin(){try{const d=await api("admin_stats");setAdminData(d);setTab("admin")}catch(e){alert(e.message)}}
  async function saveOverride(){try{await api("admin_save_override",{school_name:adminSchool,data:JSON.parse(adminJson)});await loadAdmin()}catch(e){alert(e.message)}}
  async function sendFeedback(){if(!feedback.trim())return;try{await api("feedback",{message:feedback});setFeedback("")}catch(e){alert(e.message)}}

  function addActivity(){update("activities",[...(profile.activities||[]),{name:"",category:"other",status:"ongoing",years:null,hours_per_week:null,role:"",impact_scope:"unknown",measurable_outcome:"",major_related:false}])}
  function setActivity(i,k,v){update("activities",profile.activities.map((a,j)=>j===i?{...a,[k]:v}:a))}
  function addAward(){update("awards",[...(profile.awards||[]),{name:"",level:"unknown",status:"earned",major_related:false}])}
  function setAward(i,k,v){update("awards",profile.awards.map((a,j)=>j===i?{...a,[k]:v}:a))}

  const collegeRows=useMemo(()=>{
    const q=collegeQuery.toLowerCase();return (predictions?.schools||[]).filter(s=>(collegeCountry==="all"||s.country===collegeCountry)&&(collegeTier==="all"||s.tier===collegeTier)&&(!q||`${s.school} ${s.program}`.toLowerCase().includes(q)));
  },[predictions,collegeCountry,collegeTier,collegeQuery]);
  const draftPlans=useMemo(()=>buildDraftPortfolio(predictions),[predictions]);
  const effectiveApplicationPlans=plans.length?plans:draftPlans;
  useEffect(()=>{
    if(!session||tab!=="applications")return;
    if(!effectiveApplicationPlans.length){setStrategy(null);setSimulation(null);return;}
    api("optimize_strategy",{plans:effectiveApplicationPlans}).then(setStrategy).catch(e=>console.warn("Strategy refresh failed",e));
  },[tab,session?.access_token,plans,predictions]);
  const completedRoadmap=roadmap.filter(x=>x.status==="done").length;

  if(!session)return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} submit={signIn} msg={authMsg}/>;
  const hs=highSchools.find(h=>h.id===profile.high_school_id);

  return <div className="shell">
    <aside className="rail">
      <div className="brand"><div className="mark">U</div><div><b>UniPath</b><small>Admissions OS</small></div></div>
      <nav>{NAV.map(([id,name])=><button key={id} className={tab===id?"active":""} onClick={()=>id==="history"?loadHistory():setTab(id)}>{name}</button>)}{isAdmin&&<button className={tab==="admin"?"active":""} onClick={loadAdmin}>Admin</button>}</nav>
      <div className="account"><span>{session.user.email}</span><button onClick={logout}>Log out</button></div>
    </aside>

    <main className="workspace">
      <header className="mast"><div><span className="kicker">UNIPATH / {tab.toUpperCase()}</span><h1>{title(tab)}</h1><p>{subtitle(tab)}</p></div><div className="mastActions"><button className="quiet" onClick={saveProfile}>{loading==="save"?"Saving…":"Save profile"}</button><button className="solid" onClick={runPrediction}>{loading==="predict"?"Running hybrid model…":"Run prediction"}</button></div></header>

      {tab==="overview"&&<Overview profile={profile} predictions={predictions} plans={plans} roadmap={roadmap} completedRoadmap={completedRoadmap} hs={hs} go={setTab} runPrediction={runPrediction}/>}      
      {tab==="profile"&&<ProfileEditor profile={profile} update={update} importText={importText} setImportText={setImportText} importProfile={importProfile} loading={loading} addActivity={addActivity} setActivity={setActivity} addAward={addAward} setAward={setAward}/>}      
      {tab==="colleges"&&<Colleges rows={collegeRows} predictions={predictions} plans={plans} addSchool={addSchool} country={collegeCountry} setCountry={setCollegeCountry} tier={collegeTier} setTier={setCollegeTier} query={collegeQuery} setQuery={setCollegeQuery} run={runPrediction} loading={loading}/>}      
      {tab==="opportunities"&&<Opportunities items={opps} saved={savedOpps} kind={oppKind} setKind={setOppKind} query={oppQuery} setQuery={setOppQuery} search={loadOpportunities} save={saveOpportunity} remove={removeOpportunity} loading={loading}/>}      
      {tab==="roadmap"&&<Roadmap items={roadmap} generated={generatedRoadmap} generate={generateRoadmap} accept={acceptRoadmap} update={updateRoadmapItem} remove={deleteRoadmapItem} savedOpps={savedOpps} loading={loading}/>}      
      {tab==="applications"&&<Applications plans={plans} draftPlans={draftPlans} effectivePlans={effectiveApplicationPlans} saveDraft={saveSuggestedPortfolio} change={changePlan} remove={deletePlan} optimize={optimize} strategy={strategy} simulate={simulate} simulation={simulation} loading={loading}/>}      
      {tab==="advisor"&&<Advisor chat={chat} question={question} setQuestion={setQuestion} send={askAI} clear={clearChat} loading={loading}/>}      
      {tab==="history"&&<History rows={history}/>}      
      {tab==="admin"&&isAdmin&&<Admin data={adminData} school={adminSchool} setSchool={setAdminSchool} json={adminJson} setJson={setAdminJson} save={saveOverride}/>}      

      <div className="feedback"><span>Something wrong or missing?</span><input value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Tell us what the model got wrong."/><button onClick={sendFeedback}>Send</button></div>
      <footer>Planning model, not an admissions decision system. University policies, program availability, deadlines and aggregate school-outcome data should be verified from current official sources.</footer>
    </main>
  </div>;
}

function AuthScreen({mode,setMode,email,setEmail,password,setPassword,submit,msg}){
  return <main className="auth"><section><div className="mark xl">U</div><span className="kicker">UNIPATH</span><h1>A quieter way to plan a complicated application.</h1><p>One persistent profile, a hybrid admissions model, opportunity matching, a living roadmap and a counselor that remembers the plan.</p><div className="chips"><span>127 universities</span><span>114 majors</span><span>69 opportunity pathways</span><span>43 high schools</span><span>DeepSeek V4</span></div></section><form onSubmit={submit}><h2>{mode==="login"?"Sign in":"Create account"}</h2><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/></label><button className="solid" type="submit">{mode==="login"?"Continue":"Create account"}</button>{msg&&<div className="notice">{msg}</div>}<button type="button" className="textButton" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create an account":"Already have an account"}</button></form></main>
}

function Overview({profile,predictions,plans,roadmap,completedRoadmap,hs,go,runPrediction}){
  const s=predictions?.scores||{};const ai=predictions?.ai_assessment;
  return <>
    <section className="metricRow"><Metric label="Hybrid profile" value={score(s.overall)}/><Metric label="Academic" value={score(s.academic)}/><Metric label="Execution" value={score(s.output)}/><Metric label="Plan" value={`${completedRoadmap}/${roadmap.length||0}`}/></section>
    <section className="two"><article className="panel heroPanel"><span className="overline">CURRENT STATE</span><h2>{profile.primary_major||"Choose a primary direction"}</h2><p>{profile.profile_summary||"Complete your profile, then UniPath will connect academics, activities, opportunities and application strategy into one persistent plan."}</p><div className="facts"><span>{profile.current_grade==="unknown"?"Grade not set":`Grade ${profile.current_grade}`}</span><span>{profile.sat?`SAT ${profile.sat}`:"Test score not set"}</span><span>{hs?.name||profile.high_school_name||"High school not set"}</span></div><div className="row"><button className="solid" onClick={runPrediction}>Refresh model</button><button className="quiet" onClick={()=>go("profile")}>Edit profile</button></div></article>
      <article className="panel"><span className="overline">NEXT BEST ACTIONS</span><ActionLine n="01" title="Complete the evidence" text="Separate completed work from plans; add measurable outputs." onClick={()=>go("profile")}/><ActionLine n="02" title="Balance the college list" text={`${plans.length} schools currently saved.`} onClick={()=>go("colleges")}/><ActionLine n="03" title="Build the next 9–12 months" text="Generate a roadmap from profile gaps and real opportunity categories." onClick={()=>go("roadmap")}/><ActionLine n="04" title="Keep one continuous strategy conversation" text="Advisor history is saved to your account." onClick={()=>go("advisor")}/></article>
    </section>
    {predictions&&<section className="two"><article className="panel"><div className="panelHead"><div><span className="overline">MODEL COMPOSITION</span><h3>Deterministic core + bounded AI</h3></div><span className={`status ${predictions.ai_status||"disabled"}`}>{predictions.ai_status||"deterministic"}</span></div><div className="scoreGrid"><Mini label="Rules engine" value={score(s.deterministic)}/><Mini label="AI holistic" value={ai?score(ai.overall):"—"}/><Mini label="AI weight" value={ai?`${Math.round((s.ai_weight||0)*100)}%`:"0%"}/><Mini label="Confidence" value={ai?`${Math.round(ai.confidence*100)}%`:"—"}/></div>{ai&&<p className="muted">{ai.rationale}</p>}</article><article className="panel"><span className="overline">LIST SHAPE</span><div className="tierStrip">{["Lottery","Super Reach","Reach","Target","Likely"].map(t=><div key={t}><b>{predictions.schools.filter(s=>s.tier===t).length}</b><span>{t}</span></div>)}</div></article></section>}
  </>
}

function ProfileEditor({profile,update,importText,setImportText,importProfile,loading,addActivity,setActivity,addAward,setAward}){
  const chooseHS=e=>{const id=e.target.value;const h=highSchools.find(x=>x.id===id);update("high_school_id",id||null);update("high_school_name",h?.name||null);update("school_country",h?.country||null)};
  return <section className="stack">
    <article className="panel"><div className="panelHead"><div><span className="overline">CONTEXT</span><h3>School & application direction</h3></div></div><div className="formGrid three">
      <Field label="High school"><select value={profile.high_school_id||""} onChange={chooseHS}><option value="">Select or use Other</option>{highSchools.map(h=><option key={h.id} value={h.id}>{h.name}{h.name_zh?` / ${h.name_zh}`:""}</option>)}</select></Field>
      <Field label="School name / custom"><input value={profile.high_school_name||""} onChange={e=>update("high_school_name",e.target.value)} placeholder="Type your school if not listed"/></Field>
      <Field label="Current grade"><select value={profile.current_grade} onChange={e=>update("current_grade",e.target.value)}>{["8","9","10","11","12","gap","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Graduation year"><input type="number" value={profile.graduation_year??""} onChange={e=>update("graduation_year",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="Applicant type"><select value={profile.applicant_type} onChange={e=>update("applicant_type",e.target.value)}>{["china_international","other_international","us_domestic","uk_home","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Primary major"><select value={profile.primary_major||""} onChange={e=>update("primary_major",e.target.value||null)}><option value="">Select</option>{majors.map(m=><option key={m.slug} value={m.label}>{m.label}</option>)}</select></Field>
      <Field label="Secondary major"><select value={profile.secondary_major||""} onChange={e=>update("secondary_major",e.target.value||null)}><option value="">None</option>{majors.map(m=><option key={m.slug} value={m.label}>{m.label}</option>)}</select></Field>
    </div><div className="countryChecks">{Object.entries(COUNTRY_LABEL).map(([id,label])=><label key={id}><input type="checkbox" checked={(profile.intended_countries||[]).includes(id)} onChange={e=>update("intended_countries",e.target.checked?[...(profile.intended_countries||[]),id]:(profile.intended_countries||[]).filter(x=>x!==id))}/>{label}</label>)}</div></article>

    <article className="panel"><span className="overline">ACADEMICS</span><div className="formGrid four">
      <Field label="Curriculum"><select value={profile.curriculum} onChange={e=>update("curriculum",e.target.value)}>{["ap","ib","alevel","us","other","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Grade band"><select value={profile.grade_band} onChange={e=>update("grade_band",e.target.value)}>{["top1","top5","top10","top25","mid","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="GPA"><input value={profile.gpa_description||""} onChange={e=>update("gpa_description",e.target.value)}/></Field><Field label="SAT"><input type="number" value={profile.sat??""} onChange={e=>update("sat",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="ACT"><input type="number" value={profile.act??""} onChange={e=>update("act",e.target.value?Number(e.target.value):null)}/></Field><Field label="TOEFL"><input type="number" value={profile.toefl??""} onChange={e=>update("toefl",e.target.value?Number(e.target.value):null)}/></Field><Field label="AP 5s"><input type="number" value={profile.ap_5_count??""} onChange={e=>update("ap_5_count",e.target.value?Number(e.target.value):null)}/></Field><Field label="AP 4s"><input type="number" value={profile.ap_4_count??""} onChange={e=>update("ap_4_count",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="IB predicted"><input type="number" value={profile.ib_predicted??""} onChange={e=>update("ib_predicted",e.target.value?Number(e.target.value):null)}/></Field><Field label="A* count"><input type="number" value={profile.a_star_count??""} onChange={e=>update("a_star_count",e.target.value?Number(e.target.value):null)}/></Field><Field label="Rigor"><select value={profile.academic_rigor} onChange={e=>update("academic_rigor",e.target.value)}>{["highest","strong","average","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Aid need"><select value={profile.aid_need} onChange={e=>update("aid_need",e.target.value)}>{["none","some","high","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
    </div></article>

    <article className="panel"><div className="panelHead"><div><span className="overline">ACTIVITIES</span><h3>Evidence, not résumé padding</h3></div><button className="quiet" onClick={addActivity}>Add activity</button></div>{!profile.activities.length?<Empty text="No activities yet."/>:<div className="editorList">{profile.activities.map((a,i)=><div className="activityEdit" key={i}><input value={a.name} onChange={e=>setActivity(i,"name",e.target.value)} placeholder="Activity"/><select value={a.status||"unknown"} onChange={e=>setActivity(i,"status",e.target.value)}>{["completed","ongoing","planned","unknown"].map(x=><option key={x}>{x}</option>)}</select><select value={a.category} onChange={e=>setActivity(i,"category",e.target.value)}>{["research","stem","business","service","sports","arts","humanities","social_science","work","family_responsibility","other"].map(x=><option key={x}>{x}</option>)}</select><input value={a.role||""} onChange={e=>setActivity(i,"role",e.target.value)} placeholder="Role"/><input type="number" value={a.years??""} onChange={e=>setActivity(i,"years",e.target.value?Number(e.target.value):null)} placeholder="Years"/><input type="number" value={a.hours_per_week??""} onChange={e=>setActivity(i,"hours_per_week",e.target.value?Number(e.target.value):null)} placeholder="h/week"/><select value={a.impact_scope} onChange={e=>setActivity(i,"impact_scope",e.target.value)}>{["self","school","local","regional","national","international","unknown"].map(x=><option key={x}>{x}</option>)}</select><input className="wide" value={a.measurable_outcome||""} onChange={e=>setActivity(i,"measurable_outcome",e.target.value)} placeholder="Concrete outcome / finished output"/><button className="iconDanger" onClick={()=>update("activities",profile.activities.filter((_,j)=>j!==i))}>×</button></div>)}</div>}</article>

    <article className="panel"><div className="panelHead"><div><span className="overline">AWARDS & OUTPUTS</span><h3>External validation and finished work</h3></div><button className="quiet" onClick={addAward}>Add award</button></div><div className="awardList">{profile.awards.map((a,i)=><div className="awardEdit" key={i}><input value={a.name} onChange={e=>setAward(i,"name",e.target.value)} placeholder="Award"/><select value={a.status||"earned"} onChange={e=>setAward(i,"status",e.target.value)}><option>earned</option><option>planned</option><option>unknown</option></select><select value={a.level} onChange={e=>setAward(i,"level",e.target.value)}>{["school","regional","national","international","elite","unknown"].map(x=><option key={x}>{x}</option>)}</select><button className="iconDanger" onClick={()=>update("awards",profile.awards.filter((_,j)=>j!==i))}>×</button></div>)}</div><Field label="Distinctive outputs — one per line"><textarea value={(profile.distinctive_outputs||[]).join("\n")} onChange={e=>update("distinctive_outputs",e.target.value.split("\n").map(x=>x.trim()).filter(Boolean))} placeholder="Research paper\nPrototype\nDocumentary\nPublished article…"/></Field></article>

    <article className="panel importPanel"><div><span className="overline">AI IMPORT</span><h3>Paste the messy version.</h3><p>DeepSeek converts a résumé, activities list or mixed Chinese/English notes into the structured profile. Planned items stay planned.</p></div><textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste applicant information here…"/><button className="solid" onClick={importProfile}>{loading==="import"?"Parsing + scoring…":"Import with DeepSeek"}</button></article>
  </section>
}

function Colleges({rows,predictions,plans,addSchool,country,setCountry,tier,setTier,query,setQuery,run,loading}){
  return <section className="stack"><article className="panel filterBar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search university or program"/><select value={country} onChange={e=>setCountry(e.target.value)}><option value="all">All countries</option>{Object.entries(COUNTRY_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select value={tier} onChange={e=>setTier(e.target.value)}><option value="all">All tiers</option>{["Lottery","Super Reach","Reach","Target","Likely"].map(x=><option key={x}>{x}</option>)}</select><button className="solid" onClick={run}>{loading==="predict"?"Running…":"Refresh"}</button></article>
    {!predictions?<article className="panel"><Empty text="Complete your profile and run the hybrid prediction model."/></article>:<><article className="modelNote"><b>{predictions.schools.length} modeled universities</b><span>AI contributes a bounded holistic score; public high-school outcome data contributes only a small audited context multiplier when verified. Neither layer is allowed to invent a new acceptance rate.</span></article>{(predictions.warnings||[]).map((w,i)=><div className="notice" key={i}>{w}</div>)}{!rows.length&&predictions.schools.length>0?<article className="panel"><Empty text={`No schools match the current search/filter. ${predictions.schools.length} universities are modeled — clear the search or filters to see them.`}/></article>:!predictions.schools.length?<article className="panel"><Empty text={`No program matches were produced. Primary major: ${predictions.primary_major||"not set"}. Try re-selecting the major from Profile and run again.`}/></article>:<div className="collegeList">{rows.map(s=><CollegeRow key={s.school} s={s} saved={plans.some(p=>p.school_name===s.school)} add={()=>addSchool(s)}/>)}</div>}</>}
  </section>
}
function CollegeRow({s,saved,add}){const hs=s.high_school_context;return <article className="collegeRow"><div className="collegeName"><b>{s.school}</b><span>{s.program} · {COUNTRY_LABEL[s.country]||s.country}</span><div className="badges"><i className={`tier ${s.tier.replaceAll(" ","").toLowerCase()}`}>{s.tier}</i>{hs?.label&&<i className="context">School context</i>}{s.data_quality!=="verified"&&<i>Seed data</i>}</div></div><div className="chance"><b>{pct(s.interval[0])}–{pct(s.interval[1])}</b><span>planning interval · center {pct(s.probability)}</span></div><div className="why"><span>{s.mechanism}</span>{hs?.label&&<small>{hs.label} · {hs.year}</small>}<small>{s.second_major_reason||s.source_note}</small></div><button className={saved?"saved":"quiet"} disabled={saved} onClick={add}>{saved?"Saved":"Add"}</button></article>}

function Opportunities({items,saved,kind,setKind,query,setQuery,search,save,remove,loading}){const savedIds=new Set(saved.map(x=>x.opportunity_id));return <section className="stack"><article className="panel filterBar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search summer, research, competition or project"/><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All pathways</option>{["summer","research","competition","project","work"].map(x=><option key={x}>{x}</option>)}</select><button className="solid" onClick={search}>{loading==="opps"?"Matching…":"Match to profile"}</button></article><article className="modelNote"><b>Opportunity catalog</b><span>Brand name is not the score. Match prioritizes field relevance, grade eligibility and gaps in research, output or external validation. Exact dates remain an official-source check.</span></article><div className="oppGrid">{items.map(o=><article className="opp" key={o.id}><div className="oppTop"><span className="kind">{o.kind}</span><b>{o.match_score}</b></div><h3>{o.name}</h3><p>{o.provider}</p><div className="tags">{o.tags.slice(0,4).map(t=><span key={t}>{t}</span>)}</div><ul>{(o.match_reasons||[]).map(r=><li key={r}>{r}</li>)}</ul><div className="oppFoot"><span>{o.selectivity} · {o.cost}</span>{savedIds.has(o.id)?<button onClick={()=>remove(o)}>Saved ✓</button>:<button onClick={()=>save(o)}>Save</button>}</div></article>)}</div></section>}

function Roadmap({items,generated,generate,accept,update,remove,savedOpps,loading}){return <section className="stack"><article className="panel roadmapHero"><div><span className="overline">LIVING PLAN</span><h2>Turn the profile into the next 9–12 months.</h2><p>The roadmap is persistent. The advisor sees it, and future recommendations can build on what you finished instead of restarting every conversation.</p></div><button className="solid" onClick={generate}>{loading==="roadmap"?"DeepSeek is planning…":"Generate roadmap"}</button></article>{generated&&<article className="panel generated"><div className="panelHead"><div><span className="overline">AI DRAFT</span><h3>{generated.summary||"Roadmap draft"}</h3></div><button className="solid" onClick={accept}>{loading==="acceptRoadmap"?"Saving…":"Add to my roadmap"}</button></div><div className="roadmapList">{(generated.items||[]).map((x,i)=><div className="roadItem" key={i}><span className={`priority ${x.priority}`}>{x.priority}</span><div><b>{x.title}</b><small>{x.due_window} · {x.why}</small><em>{x.success_metric}</em></div></div>)}</div></article>}
    <article className="panel"><div className="panelHead"><div><span className="overline">MY ROADMAP</span><h3>{items.length} active records</h3></div><span className="muted">{savedOpps.length} opportunities saved</span></div>{!items.length?<Empty text="No roadmap items yet. Generate a draft or add opportunities first."/>:<div className="roadmapList">{items.map(x=><div className={`roadItem ${x.status==="done"?"done":""}`} key={x.id}><button className="checkBtn" onClick={()=>update(x,{status:x.status==="done"?"todo":"done"})}>{x.status==="done"?"✓":"○"}</button><div><b>{x.title}</b><small>{x.due_window||x.due_date||"No date"} · {x.why||x.item_type}</small>{x.success_metric&&<em>{x.success_metric}</em>}</div><span className={`priority ${x.priority}`}>{x.priority}</span><button className="iconDanger" onClick={()=>remove(x)}>×</button></div>)}</div>}</article></section>}

function Applications({plans,draftPlans,effectivePlans,saveDraft,change,remove,optimize,strategy,simulate,simulation,loading}){
  const usingDraft=!plans.length&&draftPlans.length>0;
  const list=effectivePlans||[];
  const grouped=(tier)=>list.filter(p=>p.tier===tier).map(p=>p.school_name);
  const roundText=(p)=>roundLabel[p.round]||p.round;
  return <section className="stack">
    <article className="panel applicationIntro">
      <div className="panelHead"><div><span className="overline">APPLICATION PORTFOLIO</span><h3>{plans.length?`${plans.length} saved schools`:`${draftPlans.length} model suggestions`}</h3></div><div className="row">{usingDraft&&<button className="solid" onClick={()=>saveDraft(draftPlans)}>{loading==="saveDraft"?"Saving…":"Save suggested list"}</button>}<button className="quiet" disabled={!list.length} onClick={()=>optimize(list)}>{loading==="strategy"?"Refreshing…":"Refresh strategy"}</button><button className="solid" disabled={!list.length} onClick={()=>simulate(3000,list)}>{loading==="simulate"?"Simulating…":"Simulate 3,000 cycles"}</button></div></div>
      {usingDraft&&<div className="notice">No colleges are saved yet, so UniPath is showing a balanced draft from your latest prediction. Save it, then edit the list and rounds. This draft is a starting point—not a statement of personal preference.</div>}
      {!list.length?<Empty text="Run a college prediction first. UniPath will create a model-balanced draft here, or add individual colleges from the Colleges page."/>:<div className="applicationList">{list.map(p=>{const rules=roundRules[p.school_name]||{plans:[p.country==="uk"?"UCAS":"RD"]};return <div className={`appRow ${p.draft?"draft":""}`} key={p.id}><div><b>{p.school_name}</b><span>{p.program}{p.draft?" · suggested":""}</span></div><span>{pct(p.probability_min)}–{pct(p.probability_max)}</span>{p.draft?<span className="roundPill">{roundText(p)}</span>:<select value={p.round} onChange={e=>change(p,{round:e.target.value})}>{rules.plans.map(r=><option key={r} value={r}>{roundLabel[r]||r}</option>)}</select>}{p.draft?<span/>:<button className="iconDanger" onClick={()=>remove(p)}>×</button>}</div>})}</div>}
    </article>

    <article className="panel strategyPanel">
      <div className="panelHead"><div><span className="overline">ED / EA / RD STRATEGY</span><h3>Round strategy</h3></div><span className="muted">Built from the {usingDraft?"current model draft":"saved portfolio"}</span></div>
      {!list.length?<Empty text="A round strategy will appear after a college model is available."/>:!strategy?<Empty text="Building strategy…"/>:<>
        <div className="strategyGrid">
          <div className="strategyCard"><span>ED I candidates</span><b>{(strategy.strategy?.ed1_candidates||[]).map(x=>x.school).join(" · ")||"No ED I school in this list"}</b><small>Binding. Pick only a genuine first choice after fit and affordability checks.</small></div>
          <div className="strategyCard"><span>ED II contingency</span><b>{(strategy.strategy?.ed2_candidates||[]).map(x=>x.school).join(" · ")||"No ED II option in this list"}</b><small>Use only if ED I does not end the process and the school remains a true preference.</small></div>
          <div className="strategyCard"><span>EA / REA / SCEA</span><b>{(strategy.strategy?.ea||[]).join(" · ")||"—"}</b><small>Restrictive plans must be checked against every other early application.</small></div>
          <div className="strategyCard"><span>RD core</span><b>{(strategy.strategy?.rd_core||[]).slice(0,8).join(" · ")||"—"}</b><small>Keep enough target/likely coverage instead of using RD only for additional reaches.</small></div>
        </div>
        <div className="portfolioShape"><span><b>{grouped("Lottery").length+grouped("Super Reach").length}</b> ultra-high risk</span><span><b>{grouped("Reach").length}</b> reach</span><span><b>{grouped("Target").length}</b> target</span><span><b>{grouped("Likely").length}</b> likely</span></div>
        {strategy.validation?.errors?.map(x=><div className="error" key={x}>{x}</div>)}{strategy.validation?.warnings?.map(x=><div className="notice" key={x}>{x}</div>)}
      </>}
    </article>

    <article className="panel"><span className="overline">MONTE CARLO</span>{simulation?<div className="metricRow compact"><Metric label="Expected admits" value={simulation.simulation.expected_admits.toFixed(1)}/><Metric label="Zero-admit risk" value={pct(simulation.simulation.zero_admit_risk)}/><Metric label="Binding finish" value={pct(simulation.simulation.binding_finish_rate)}/><Metric label="Top-20 hit" value={pct(simulation.simulation.top20_hit_rate)}/></div>:<Empty text={list.length?"Run the simulation after reviewing the round strategy. No result is shown until a simulation has actually run.":"Create a portfolio before simulating."}/>}</article>
  </section>
}
function Advisor({chat,question,setQuestion,send,clear,loading}){return <section className="advisorLayout"><article className="panel advisorPanel"><div className="panelHead"><div><span className="overline">PERSISTENT THREAD</span><h3>Your strategy conversation</h3></div><button className="textButton" onClick={clear}>Clear</button></div><div className="chat">{chat.length?chat.map((m,i)=><div className={`message ${m.role}`} key={i}>{m.text}</div>):<div className="message ai">I can use your saved profile, current prediction intervals, application plan and roadmap. Ask a question that changes a decision.</div>}</div><div className="composer"><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="What should I prioritize next?"/><button className="solid" onClick={send}>{loading==="chat"?"Thinking…":"Send"}</button></div></article><aside className="panel prompts"><span className="overline">USEFUL QUESTIONS</span>{["我的活动现在最像什么申请叙事？","未来六个月最值得完成的三个输出是什么？","我的选校是不是过于激进？","如果不参加昂贵夏校，我该怎么补强？","第二专业到底有没有真实战略价值？"].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</aside></section>}

function History({rows}){return <article className="panel"><span className="overline">MODEL HISTORY</span>{!rows.length?<Empty text="No prediction history yet."/>:<div className="history">{rows.map(r=><div key={r.id}><b>{r.primary_major||"Unknown major"}</b><span>{new Date(r.created_at).toLocaleString()}</span><small>{r.result?.ai_status||"deterministic"} · {r.result?.schools?.length||0} schools</small></div>)}</div>}</article>}
function Admin({data,school,setSchool,json,setJson,save}){if(!data)return <article className="panel"><Empty text="Loading admin data…"/></article>;return <section className="stack"><section className="metricRow"><Metric label="Profiles" value={data.stats.profiles}/><Metric label="Prediction runs" value={data.stats.runs}/><Metric label="Roadmap items" value={data.stats.roadmap}/><Metric label="Chat messages" value={data.stats.chat}/></section><article className="two"><div className="panel"><span className="overline">INFRASTRUCTURE</span><h3>DeepSeek + Supabase</h3><p>Model: <b>{data.model}</b></p><p>{data.catalog?.universities} universities · {data.catalog?.high_schools} high schools · {data.catalog?.total} opportunity pathways.</p><div className="notice">Keep DEEPSEEK_API_KEY and the Supabase server key server-only in Vercel.</div></div><div className="panel"><span className="overline">UNIVERSITY DATA OVERRIDE</span><select value={school} onChange={e=>setSchool(e.target.value)}>{schools.map(s=><option key={s.name}>{s.name}</option>)}</select><textarea className="code" value={json} onChange={e=>setJson(e.target.value)}/><button className="solid" onClick={save}>Save verified override</button></div></article><article className="panel"><span className="overline">ACTIVE OVERRIDES</span>{data.overrides?.length?data.overrides.map(o=><div className="override" key={o.school_name}><b>{o.school_name}</b><code>{JSON.stringify(o.data)}</code></div>):<Empty text="No live university overrides."/>}</article></section>}

function Metric({label,value}){return <div className="metric"><span>{label}</span><b>{value}</b></div>}
function Mini({label,value}){return <div className="mini"><span>{label}</span><b>{value}</b></div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Empty({text}){return <div className="empty">{text}</div>}
function ActionLine({n,title,text,onClick}){return <button className="actionLine" onClick={onClick}><span>{n}</span><div><b>{title}</b><small>{text}</small></div><i>↗</i></button>}
function title(t){return {overview:"Overview",profile:"Applicant profile",colleges:"College model",opportunities:"Opportunity map",roadmap:"Roadmap",applications:"Application strategy",advisor:"AI advisor",history:"Prediction history",admin:"Admin"}[t]||"UniPath"}
function subtitle(t){return {overview:"One stateful system for the profile, next actions and application risk.",profile:"Build the evidence base the model is allowed to use.",colleges:"Hybrid scoring with bounded AI and audited school-context signals.",opportunities:"Summer programs, research, competitions and self-directed pathways matched to actual gaps.",roadmap:"A persistent 9–12 month plan that survives across conversations.",applications:"Rounds, portfolio balance and Monte Carlo stress testing.",advisor:"A continuous planning conversation grounded in saved data.",history:"See how your model changes as the profile changes.",admin:"Manage model data quality and product usage."}[t]||""}
