"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { EmptyProfile } from "@/lib/schema";
import majors from "@/data/majors.json";
import schools from "@/data/schools.json";
import roundRules from "@/data/rounds.json";

const NAV=[
  ["dashboard","⌂","Dashboard"],
  ["profile","◎","Profile"],
  ["import","✦","AI Import"],
  ["colleges","⌕","Schools & Majors"],
  ["recommend","↗","Academic & Activities"],
  ["strategy","⇄","ED / RD Planner"],
  ["simulator","◉","Application Simulator"],
  ["counselor","✧","AI Counselor"],
  ["history","◫","History"],
];

const pct=x=>`${Math.round((Number(x)||0)*100)}%`;
const fmtScore=x=>Math.round(Number(x)||0);
const roundLabel={ED1:"ED I",ED2:"ED II",EA:"EA",EA2:"EA2",REA:"REA",SCEA:"SCEA",RD:"RD",RA:"RA",UC:"UC",UCAS:"UCAS",OX:"Oxbridge UCAS",ROLLING:"Rolling"};

function majorLabel(slugOrText) {
  return majors.find(m=>m.slug===slugOrText)?.label || slugOrText || "—";
}

export default function Home() {
  const [supabase,setSupabase]=useState(null);
  const [session,setSession]=useState(null);
  const [authMode,setAuthMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [authMsg,setAuthMsg]=useState("");
  const [tab,setTab]=useState("dashboard");
  const [profile,setProfile]=useState({...EmptyProfile});
  const [predictions,setPredictions]=useState(null);
  const [recommendations,setRecommendations]=useState(null);
  const [plans,setPlans]=useState([]);
  const [history,setHistory]=useState([]);
  const [isAdmin,setIsAdmin]=useState(false);
  const [adminData,setAdminData]=useState(null);
  const [loading,setLoading]=useState("");
  const [freeText,setFreeText]=useState("");
  const [question,setQuestion]=useState("根据我的profile和选校结果，我的申请策略最应该先改哪三件事？");
  const [chat,setChat]=useState([]);
  const [simulation,setSimulation]=useState(null);
  const [strategy,setStrategy]=useState(null);
  const [filterCountry,setFilterCountry]=useState("all");
  const [filterTier,setFilterTier]=useState("all");
  const [adminSchool,setAdminSchool]=useState("Harvard");
  const [adminJson,setAdminJson]=useState('{\n  "sel": 0.035,\n  "source_note": "Replace with verified current-cycle data"\n}');
  const [feedback,setFeedback]=useState("");

  useEffect(()=>{
    try {
      const s=getSupabaseBrowser();
      setSupabase(s);
      s.auth.getSession().then(({data})=>setSession(data.session));
      const {data:{subscription}}=s.auth.onAuthStateChange((_event,next)=>setSession(next));
      return ()=>subscription.unsubscribe();
    } catch(e) { setAuthMsg(e.message); }
  },[]);

  useEffect(()=>{
    if(session) bootstrap();
  },[session]);

  async function api(action,body={}) {
    if(!session?.access_token) throw new Error("Please log in.");
    const res=await fetch("/api/unipath",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},
      body:JSON.stringify({action,...body})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Request failed");
    return data;
  }

  async function bootstrap() {
    try {
      setLoading("bootstrap");
      const [me,p,pl]=await Promise.all([api("me"),api("load_profile"),api("list_plans")]);
      setIsAdmin(me.is_admin);
      if(p.profile) setProfile({...EmptyProfile,...p.profile});
      setPlans(pl.plans||[]);
    } catch(e) { alert(e.message); }
    finally { setLoading(""); }
  }

  async function signIn(e) {
    e.preventDefault(); setAuthMsg("");
    try {
      if(!supabase) throw new Error("Supabase is not configured.");
      if(authMode==="signup") {
        const {error}=await supabase.auth.signUp({email,password});
        if(error) throw error;
        setAuthMsg("Account created. If email confirmation is enabled, check your inbox.");
      } else {
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
      }
    } catch(e){setAuthMsg(e.message)}
  }

  async function logout(){ await supabase?.auth.signOut(); setSession(null); }

  function update(key,value){ setProfile(p=>({...p,[key]:value})); }

  async function saveProfile() {
    try{setLoading("saveProfile");await api("save_profile",{profile});}
    catch(e){alert(e.message)} finally{setLoading("")}
  }

  async function analyzeProfile() {
    try{
      setLoading("analyze");
      const data=await api("analyze",{
        text:freeText,age_band:profile.age_band,
        primary_major:profile.primary_major,secondary_major:profile.secondary_major
      });
      setProfile({...EmptyProfile,...data.profile});
      setPredictions(data.predictions);
      setTab("colleges");
    }catch(e){alert(e.message)} finally{setLoading("")}
  }

  async function runPrediction() {
    try{
      setLoading("predict");
      const data=await api("predict",{profile,primary_major:profile.primary_major,secondary_major:profile.secondary_major});
      setPredictions(data.predictions);
      setTab("colleges");
    }catch(e){alert(e.message)} finally{setLoading("")}
  }

  async function runRecommendations() {
    try{
      setLoading("recommend");
      const data=await api("recommend",{profile,primary_major:profile.primary_major,predictions});
      setRecommendations(data.recommendations); setTab("recommend");
    }catch(e){alert(e.message)} finally{setLoading("")}
  }

  async function addSchool(row) {
    try{
      const rule=roundRules[row.school]||{default:row.country==="uk"?"UCAS":"RD"};
      const data=await api("save_plan",{plan:{
        school_name:row.school,program:row.program,major:row.major,round:rule.default,
        probability:row.probability,probability_min:row.interval[0],probability_max:row.interval[1],
        tier:row.tier,status:"Planning"
      }});
      setPlans(p=>[...p.filter(x=>x.school_name!==row.school),data.plan]);
    }catch(e){alert(e.message)}
  }

  async function changePlan(plan,patch) {
    try{
      const data=await api("save_plan",{plan:{...plan,...patch}});
      setPlans(p=>p.map(x=>x.id===plan.id?data.plan:x));
    }catch(e){alert(e.message)}
  }

  async function deletePlan(plan) {
    if(!confirm(`Remove ${plan.school_name} from your application plan?`)) return;
    try{await api("delete_plan",{id:plan.id});setPlans(p=>p.filter(x=>x.id!==plan.id));}
    catch(e){alert(e.message)}
  }

  async function optimizeStrategy() {
    try{
      setLoading("strategy");const data=await api("optimize_strategy",{plans});
      setStrategy(data);setTab("strategy");
    }catch(e){alert(e.message)}finally{setLoading("")}
  }

  async function simulate(runs=1000) {
    try{
      setLoading("simulate");const data=await api("simulate",{plans,runs});
      setSimulation(data);setTab("simulator");
    }catch(e){alert(e.message)}finally{setLoading("")}
  }

  async function askAI() {
    if(!question.trim())return;
    const q=question;setChat(c=>[...c,{role:"user",text:q}]);setQuestion("");
    try{
      setLoading("counsel");
      const data=await api("counsel",{question:q,profile,predictions,plans});
      setChat(c=>[...c,{role:"ai",text:data.answer}]);
    }catch(e){setChat(c=>[...c,{role:"ai",text:`Error: ${e.message}`}])}
    finally{setLoading("")}
  }

  async function loadHistory() {
    try{const d=await api("history");setHistory(d.runs||[]);setTab("history");}
    catch(e){alert(e.message)}
  }

  async function loadAdmin() {
    try{const d=await api("admin_stats");setAdminData(d);setTab("admin");}
    catch(e){alert(e.message)}
  }

  async function saveOverride() {
    try{
      const data=JSON.parse(adminJson);
      await api("admin_save_override",{school_name:adminSchool,data});
      await loadAdmin();
    }catch(e){alert(e.message)}
  }

  async function sendFeedback() {
    try{await api("feedback",{message:feedback});setFeedback("");alert("Thanks — feedback saved.");}
    catch(e){alert(e.message)}
  }

  function addActivity(){update("activities",[...profile.activities,{name:"",category:"other",years:null,hours_per_week:null,role:"",impact_scope:"unknown",measurable_outcome:"",major_related:false}])}
  function setActivity(i,key,value){update("activities",profile.activities.map((a,j)=>j===i?{...a,[key]:value}:a))}
  function delActivity(i){update("activities",profile.activities.filter((_,j)=>j!==i))}
  function addAward(){update("awards",[...profile.awards,{name:"",level:"unknown",major_related:false}])}
  function setAward(i,key,value){update("awards",profile.awards.map((a,j)=>j===i?{...a,[key]:value}:a))}
  function delAward(i){update("awards",profile.awards.filter((_,j)=>j!==i))}

  const filteredSchools=(predictions?.schools||[]).filter(s=>
    (filterCountry==="all"||s.country===filterCountry) &&
    (filterTier==="all"||s.tier===filterTier)
  );

  if(!session) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} submit={signIn} msg={authMsg}/>;

  const score=predictions?.scores;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="logo">U</div><div><b>UniPath AI</b><small>Application Strategy OS</small></div></div>
      <div className="nav">
        {NAV.map(([id,ico,name])=><button key={id} className={tab===id?"active":""} onClick={()=>id==="history"?loadHistory():setTab(id)}><span>{ico}</span>{name}</button>)}
        {isAdmin&&<button className={tab==="admin"?"active":""} onClick={loadAdmin}><span>⚙</span>Admin</button>}
      </div>
      <div className="userBox"><small>{session.user.email}</small><button onClick={logout}>Log out</button></div>
    </aside>

    <main className="main">
      <header className="top">
        <div><div className="eyebrow">UNIPATH AI</div><h1>{titleFor(tab)}</h1><p>{subtitleFor(tab)}</p></div>
        <div className="topActions"><button className="ghost" onClick={saveProfile}>{loading==="saveProfile"?"Saving…":"Save Profile"}</button><button className="primary" onClick={runPrediction}>{loading==="predict"?"Calculating…":"Run Prediction"}</button></div>
      </header>

      {tab==="dashboard"&&<Dashboard profile={profile} score={score} predictions={predictions} plans={plans} go={setTab} onPredict={runPrediction} onRecommend={runRecommendations}/>}

      {tab==="profile"&&<ProfilePage profile={profile} update={update} addActivity={addActivity} setActivity={setActivity} delActivity={delActivity} addAward={addAward} setAward={setAward} delAward={delAward}/>}

      {tab==="import"&&<section className="grid2">
        <div className="card"><h2>AI Profile Import</h2><p>粘贴自我介绍、Activities List、简历摘要或中英文混合信息。AI 会结构化后保存到你的账户。</p>
          <textarea className="bigText" value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="Paste your applicant profile here..."/>
          <button className="primary" onClick={analyzeProfile}>{loading==="analyze"?"Analyzing…":"Analyze with GitHub Models"}</button>
        </div>
        <div className="card"><h2>What AI extracts</h2><div className="featureGrid">{["GPA / curriculum","SAT / ACT / English","Awards","Activities & duration","Leadership & impact","Research / creative output","Primary major","Secondary major","Missing information"].map(x=><div className="feature" key={x}>{x}</div>)}</div>
          <div className="notice">AI 只负责理解资料。最终学校概率由确定性 UniPath engine 计算，不让模型自己随口编百分比。</div>
        </div>
      </section>}

      {tab==="colleges"&&<section>
        <div className="toolbar card"><div><b>Primary:</b> {profile.primary_major||"—"}</div><div><b>Secondary:</b> {profile.secondary_major||"—"}</div>
          <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}><option value="all">US + UK</option><option value="us">US</option><option value="uk">UK</option></select>
          <select value={filterTier} onChange={e=>setFilterTier(e.target.value)}><option value="all">All tiers</option>{["Lottery","Super Reach","Reach","Target","Likely"].map(x=><option key={x}>{x}</option>)}</select>
        </div>
        {!predictions?<Empty text="Run Prediction first."/>:<div className="schoolList">{filteredSchools.map(s=><SchoolRow key={s.school} s={s} saved={plans.some(p=>p.school_name===s.school)} add={()=>addSchool(s)}/>)}</div>}
      </section>}

      {tab==="recommend"&&<RecommendationsPage data={recommendations} run={runRecommendations} loading={loading==="recommend"}/>}

      {tab==="strategy"&&<StrategyPage plans={plans} changePlan={changePlan} deletePlan={deletePlan} optimize={optimizeStrategy} data={strategy} loading={loading==="strategy"}/>}

      {tab==="simulator"&&<SimulatorPage plans={plans} simulation={simulation} run={simulate} loading={loading==="simulate"}/>}

      {tab==="counselor"&&<section className="grid2"><div>
        <div className="chat">{chat.length?chat.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.text}</div>):<div className="msg ai">Ask about ED choices, major strategy, school list balance, activities, academics, essays, or what-if scenarios.</div>}</div>
        <div className="chatInput"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="Ask UniPath AI..."/><button className="primary" onClick={askAI}>{loading==="counsel"?"Thinking…":"Send"}</button></div>
      </div><div className="card"><h2>Grounding</h2><p>The counselor receives your structured profile, deterministic school predictions and saved application plan. It is instructed not to create its own admissions percentages.</p>
        <div className="quick">{["我应该把ED给哪所学校？","第二专业真的能提高机会吗？","我的活动最弱的地方是什么？","这个list是不是太激进？","文科申请还缺什么？"].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</div>
      </div></section>}

      {tab==="history"&&<section className="card"><h2>Prediction History</h2>{history.length?history.map(r=><div className="historyRow" key={r.id}><div><b>{r.primary_major}</b><small>{r.secondary_major||"No secondary major"}</small></div><div>{new Date(r.created_at).toLocaleString()}</div><div>{r.result?.schools?.length||0} schools</div></div>):<Empty text="No saved prediction runs yet."/>}</section>}

      {tab==="admin"&&isAdmin&&<AdminPage data={adminData} school={adminSchool} setSchool={setAdminSchool} json={adminJson} setJson={setAdminJson} save={saveOverride}/>}

      <section className="feedback card"><div><b>Feedback</b><small>Help calibrate the product.</small></div><input value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What felt wrong or missing?"/><button className="ghost" onClick={sendFeedback}>Send</button></section>
      <footer>Planning tool only — not an official admissions model. Verify policies, deadlines, programs, testing and aid rules with each university.</footer>
    </main>
  </div>;
}

function AuthScreen({mode,setMode,email,setEmail,password,setPassword,submit,msg}) {
  return <main className="auth">
    <div className="authHero"><div className="logo big">U</div><div className="eyebrow">UNIPATH AI</div><h1>University application planning with an AI layer and an auditable prediction engine.</h1>
      <p>Profile → school/major recommendations → academic/activity strategy → ED/RD planning → application simulation → AI counselor.</p>
      <div className="authFeatures"><span>52-school seed database</span><span>114 majors</span><span>GitHub Models AI</span><span>Saved user profiles</span><span>Admin dashboard</span></div>
    </div>
    <form className="authCard" onSubmit={submit}><h2>{mode==="login"?"Welcome back":"Create account"}</h2>
      <label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/>
      <button className="primary" type="submit">{mode==="login"?"Log in":"Sign up"}</button>
      {msg&&<div className="notice">{msg}</div>}
      <button type="button" className="linkBtn" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Need an account? Sign up":"Already have an account? Log in"}</button>
    </form>
  </main>
}

function Dashboard({profile,score,predictions,plans,go,onPredict,onRecommend}) {
  const s=score||{overall:0,academic:0,activities:0,output:0,awards:0,narrative:0};
  return <>
    <section className="stats">
      <Stat label="Overall Profile" value={fmtScore(s.overall)||"—"}/>
      <Stat label="Academic" value={fmtScore(s.academic)||"—"}/>
      <Stat label="Activities" value={fmtScore(s.activities)||"—"}/>
      <Stat label="Saved Schools" value={plans.length}/>
    </section>
    <section className="grid2">
      <div className="card"><h2>Profile status</h2><p><b>Primary major:</b> {profile.primary_major||"Not set"}</p><p><b>Secondary:</b> {profile.secondary_major||"Not set"}</p><p><b>Applicant type:</b> {profile.applicant_type}</p><p><b>SAT:</b> {profile.sat||"—"} · <b>Activities:</b> {profile.activities.length} · <b>Awards:</b> {profile.awards.length}</p>
        <div className="buttonRow"><button className="ghost" onClick={()=>go("profile")}>Edit profile</button><button className="primary" onClick={onPredict}>Generate schools</button></div>
      </div>
      <div className="card"><h2>Next actions</h2><Action title="1. Complete profile" detail="Add academics, activities, awards and both intended directions." go={()=>go("profile")}/><Action title="2. Generate school list" detail="Compare primary vs secondary major when the school actually admits by college/major." go={onPredict}/><Action title="3. Find gaps" detail="Generate field-aware academic and extracurricular recommendations." go={onRecommend}/><Action title="4. Build application strategy" detail="Save schools, assign ED/EA/RD, then simulate the full cycle." go={()=>go("strategy")}/></div>
    </section>
    {predictions&&<section className="card"><h2>Current list snapshot</h2><div className="tierGrid">{["Lottery","Super Reach","Reach","Target","Likely"].map(t=><div key={t}><small>{t}</small><b>{predictions.schools.filter(s=>s.tier===t).length}</b></div>)}</div></section>}
  </>;
}

function ProfilePage({profile,update,addActivity,setActivity,delActivity,addAward,setAward,delAward}) {
  return <section className="profileSections">
    <div className="card"><h2>Identity & academics</h2><div className="formGrid">
      <Field label="Applicant type"><select value={profile.applicant_type} onChange={e=>update("applicant_type",e.target.value)}>{["china_international","other_international","us_domestic","uk_home","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Age band"><select value={profile.age_band} onChange={e=>update("age_band",e.target.value)}><option value="13_17">13–17</option><option value="18_plus">18+</option><option value="unknown">Unknown</option></select></Field>
      <Field label="Curriculum"><select value={profile.curriculum} onChange={e=>update("curriculum",e.target.value)}>{["ap","ib","alevel","other","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Grade band"><select value={profile.grade_band} onChange={e=>update("grade_band",e.target.value)}>{["top1","top5","top10","top25","mid","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="GPA description"><input value={profile.gpa_description||""} onChange={e=>update("gpa_description",e.target.value)}/></Field>
      <Field label="SAT"><input type="number" value={profile.sat??""} onChange={e=>update("sat",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="ACT"><input type="number" value={profile.act??""} onChange={e=>update("act",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="TOEFL"><input type="number" value={profile.toefl??""} onChange={e=>update("toefl",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="AP 5 count"><input type="number" value={profile.ap_5_count??""} onChange={e=>update("ap_5_count",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="AP 4 count"><input type="number" value={profile.ap_4_count??""} onChange={e=>update("ap_4_count",e.target.value?Number(e.target.value):null)}/></Field>
      <Field label="Academic rigor"><select value={profile.academic_rigor} onChange={e=>update("academic_rigor",e.target.value)}>{["highest","strong","average","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Quant preparation"><select value={profile.quantitative_preparation} onChange={e=>update("quantitative_preparation",e.target.value)}>{["strong","average","weak","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Writing preparation"><select value={profile.writing_preparation} onChange={e=>update("writing_preparation",e.target.value)}>{["strong","average","weak","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Aid need"><select value={profile.aid_need} onChange={e=>update("aid_need",e.target.value)}>{["none","some","high","unknown"].map(x=><option key={x}>{x}</option>)}</select></Field>
    </div></div>

    <div className="card"><h2>Application direction</h2><div className="formGrid">
      <Field label="Primary major"><select value={profile.primary_major||""} onChange={e=>update("primary_major",e.target.value)}><option value="">Select</option>{majors.map(m=><option value={m.label} key={m.slug}>{m.label}</option>)}</select></Field>
      <Field label="Secondary major"><select value={profile.secondary_major||""} onChange={e=>update("secondary_major",e.target.value||null)}><option value="">None</option>{majors.map(m=><option value={m.label} key={m.slug}>{m.label}</option>)}</select></Field>
      <Field label="Essay quality"><select value={profile.essay_quality} onChange={e=>update("essay_quality",e.target.value)}>{["unknown","average","good","excellent"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Recommendation quality"><select value={profile.recommendation_quality} onChange={e=>update("recommendation_quality",e.target.value)}>{["unknown","average","good","excellent"].map(x=><option key={x}>{x}</option>)}</select></Field>
    </div></div>

    <div className="card"><div className="cardTitle"><h2>Activities</h2><button className="ghost" onClick={addActivity}>+ Activity</button></div>
      {profile.activities.length===0?<Empty text="No activities added yet."/>:profile.activities.map((a,i)=><div className="editRow" key={i}>
        <input placeholder="Activity name" value={a.name} onChange={e=>setActivity(i,"name",e.target.value)}/>
        <select value={a.category} onChange={e=>setActivity(i,"category",e.target.value)}>{["research","stem","business","service","sports","arts","humanities","social_science","work","family_responsibility","other"].map(x=><option key={x}>{x}</option>)}</select>
        <input placeholder="Role" value={a.role||""} onChange={e=>setActivity(i,"role",e.target.value)}/>
        <input type="number" placeholder="Years" value={a.years??""} onChange={e=>setActivity(i,"years",e.target.value?Number(e.target.value):null)}/>
        <input type="number" placeholder="Hours/week" value={a.hours_per_week??""} onChange={e=>setActivity(i,"hours_per_week",e.target.value?Number(e.target.value):null)}/>
        <select value={a.impact_scope} onChange={e=>setActivity(i,"impact_scope",e.target.value)}>{["self","school","local","regional","national","international","unknown"].map(x=><option key={x}>{x}</option>)}</select>
        <input className="span2" placeholder="Measurable outcome" value={a.measurable_outcome||""} onChange={e=>setActivity(i,"measurable_outcome",e.target.value)}/>
        <label className="check"><input type="checkbox" checked={!!a.major_related} onChange={e=>setActivity(i,"major_related",e.target.checked)}/>Major-related</label>
        <button className="danger" onClick={()=>delActivity(i)}>Delete</button>
      </div>)}
    </div>

    <div className="card"><div className="cardTitle"><h2>Awards</h2><button className="ghost" onClick={addAward}>+ Award</button></div>
      {profile.awards.map((a,i)=><div className="awardRow" key={i}><input value={a.name} placeholder="Award" onChange={e=>setAward(i,"name",e.target.value)}/><select value={a.level} onChange={e=>setAward(i,"level",e.target.value)}>{["school","regional","national","international","elite","unknown"].map(x=><option key={x}>{x}</option>)}</select><label className="check"><input type="checkbox" checked={!!a.major_related} onChange={e=>setAward(i,"major_related",e.target.checked)}/>Major-related</label><button className="danger" onClick={()=>delAward(i)}>Delete</button></div>)}
    </div>

    <div className="card"><h2>Distinctive outputs</h2><p>One item per line: paper, prototype, software, publication, documentary, policy report, performance, product, patent, etc.</p><textarea value={(profile.distinctive_outputs||[]).join("\n")} onChange={e=>update("distinctive_outputs",e.target.value.split("\n").map(x=>x.trim()).filter(Boolean))}/></div>
  </section>;
}

function SchoolRow({s,saved,add}) {
  return <div className="schoolRow"><div><b>{s.school}</b><small>{s.program} · {s.country.toUpperCase()} · #{s.rank}</small>{s.second_major_reason&&<em>{s.second_major_reason}</em>}</div><div><span className={`tier ${s.tier.replaceAll(" ","").toLowerCase()}`}>{s.tier}</span></div><div className="prob">{pct(s.interval[0])}–{pct(s.interval[1])}<small>center {pct(s.probability)}</small></div><div><small>{s.mechanism}</small><small>{s.source_note}</small></div><button className={saved?"saved":"ghost"} disabled={saved} onClick={add}>{saved?"Saved":"+ Plan"}</button></div>
}

function RecommendationsPage({data,run,loading}) {
  if(!data)return <div className="card"><h2>Academic & activity recommendations</h2><p>Recommendations change by intended field. Humanities/social-science applicants are not judged by the same research/competition assumptions as engineering applicants.</p><button className="primary" onClick={run}>{loading?"Analyzing…":"Generate Recommendations"}</button></div>;
  return <section><div className="stats"><Stat label="Academic" value={fmtScore(data.scores.academic)}/><Stat label="Activities" value={fmtScore(data.scores.activities)}/><Stat label="Output" value={fmtScore(data.scores.output)}/><Stat label="Narrative" value={fmtScore(data.scores.narrative)}/></div>
    <div className="grid3"><RecColumn title="Academics" items={data.academic}/><RecColumn title="Activities" items={data.activities}/><RecColumn title="Application strategy" items={data.application}/></div></section>
}

function StrategyPage({plans,changePlan,deletePlan,optimize,data,loading}) {
  return <section>
    <div className="card cardTitle"><div><h2>Application Plan</h2><p>Save schools from Schools & Majors, then assign rounds here.</p></div><button className="primary" onClick={optimize}>{loading?"Optimizing…":"Optimize Early Strategy"}</button></div>
    {!plans.length?<Empty text="No schools saved yet."/>:<div className="planList">{plans.map(p=>{
      const rules=roundRules[p.school_name]||{plans:[p.school_name==="Oxford"||p.school_name==="Cambridge"?"OX":p.school_name?.includes("London")?"UCAS":"RD"],note:"Verify current-cycle rules."};
      return <div className="planRow" key={p.id}><div><b>{p.school_name}</b><small>{p.program}</small></div><div className="prob">{pct(p.probability_min)}–{pct(p.probability_max)}</div><select value={p.round} onChange={e=>changePlan(p,{round:e.target.value})}>{rules.plans.map(x=><option value={x} key={x}>{roundLabel[x]||x}</option>)}</select><input value={p.notes||""} placeholder="Notes" onChange={e=>changePlan(p,{notes:e.target.value})}/><button className="danger" onClick={()=>deletePlan(p)}>Remove</button></div>
    })}</div>}
    {data&&<div className="grid2 section"><div className="card"><h2>Suggested structure</h2><p><b>ED I:</b> {data.strategy.ed1?.school||"None"}</p><p><b>ED II:</b> {data.strategy.ed2?.school||"None"}</p><p><b>EA candidates:</b> {data.strategy.ea.join(", ")||"None"}</p><p>{data.strategy.note}</p></div><div className="card"><h2>Validation</h2>{data.validation.errors.map(x=><div className="error" key={x}>{x}</div>)}{data.validation.warnings.map(x=><div className="warning" key={x}>{x}</div>)}{!data.validation.errors.length&&!data.validation.warnings.length&&<div className="success">No obvious strategy conflicts detected.</div>}</div></div>}
  </section>
}

function SimulatorPage({plans,simulation,run,loading}) {
  return <section><div className="card cardTitle"><div><h2>Application Simulator</h2><p>Runs ED/EA/REA → ED II/Oxbridge → RD/UC/UCAS chronologically. Binding ED stops unresolved later applications.</p></div><div className="buttonRow"><button className="ghost" onClick={()=>run(1000)}>1,000 runs</button><button className="primary" onClick={()=>run(5000)}>{loading?"Running…":"5,000 runs"}</button></div></div>
    {!plans.length?<Empty text="Add schools to your application plan first."/>:simulation&&<><div className="stats"><Stat label="Expected admits" value={simulation.simulation.expected_admits.toFixed(1)}/><Stat label="Zero-admit risk" value={pct(simulation.simulation.zero_admit_risk)}/><Stat label="Binding finish" value={pct(simulation.simulation.binding_finish_rate)}/><Stat label="Top-20 hit" value={pct(simulation.simulation.top20_hit_rate)}/></div><div className="card"><h2>One visible simulated cycle</h2>{simulation.simulation.visible_cycle.results.map((r,i)=><div className="simRow" key={i}><div><b>{r.school_name}</b><small>{roundLabel[r.round]||r.round}</small></div><div className={`outcome ${r.outcome.includes("Admit")?"admit":r.outcome.includes("Defer")?"defer":r.outcome==="Withdrawn"?"withdraw":"deny"}`}>{r.outcome}</div><div>{r.note}</div></div>)}</div></>}
  </section>
}

function AdminPage({data,school,setSchool,json,setJson,save}) {
  if(!data)return <Empty text="Loading admin data..."/>;
  return <section><div className="stats"><Stat label="Profiles" value={data.stats.profiles}/><Stat label="Saved plans" value={data.stats.plans}/><Stat label="Prediction runs" value={data.stats.runs}/><Stat label="Feedback" value={data.stats.feedback}/></div>
    <div className="grid2"><div className="card"><h2>AI backend</h2><p><b>Model:</b> {data.model}</p><p>Provider: GitHub Models</p><div className="notice">Secrets are not shown here. Change GITHUB_TOKEN / GITHUB_MODEL in Vercel Environment Variables.</div></div>
    <div className="card"><h2>School data override</h2><select value={school} onChange={e=>setSchool(e.target.value)}>{schools.map(s=><option key={s.name}>{s.name}</option>)}</select><textarea className="codeText" value={json} onChange={e=>setJson(e.target.value)}/><button className="primary" onClick={save}>Save override</button></div></div>
    <div className="card section"><h2>Active overrides</h2>{data.overrides.length?data.overrides.map(o=><div className="historyRow" key={o.school_name}><b>{o.school_name}</b><code>{JSON.stringify(o.data)}</code><small>{new Date(o.updated_at).toLocaleString()}</small></div>):<Empty text="No school overrides yet."/>}</div>
  </section>;
}

function RecColumn({title,items}){return <div className="card"><h2>{title}</h2>{items.length?items.map((x,i)=><div className="rec" key={i}><span className={`priority ${x.priority}`}>{x.priority}</span><b>{x.title}</b><p>{x.detail}</p></div>):<p>No major gap detected.</p>}</div>}
function Stat({label,value}){return <div className="stat"><small>{label}</small><b>{value}</b></div>}
function Action({title,detail,go}){return <button className="action" onClick={go}><b>{title}</b><span>{detail}</span></button>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Empty({text}){return <div className="empty">{text}</div>}

function titleFor(t){return {dashboard:"Dashboard",profile:"Profile Builder",import:"AI Profile Import",colleges:"Schools & Majors",recommend:"Academic & Activity Strategy",strategy:"ED / EA / RD Planner",simulator:"Application Simulator",counselor:"AI Counselor",history:"Prediction History",admin:"Admin Dashboard"}[t]||"UniPath"}
function subtitleFor(t){return {dashboard:"One view of your applicant profile, school list and next decisions.",profile:"Build the structured profile used by every other module.",import:"Turn messy natural-language information into a structured application profile.",colleges:"Compare school fit, primary/secondary directions and modeled risk.",recommend:"Field-aware recommendations for academics, activities and application strategy.",strategy:"Plan binding and non-binding rounds while checking conflicts.",simulator:"Stress-test the entire application portfolio across thousands of simulated cycles.",counselor:"Ask strategy questions grounded in your saved profile and deterministic probabilities.",history:"Review recent prediction runs.",admin:"Manage product data and monitor usage."}[t]||""}
