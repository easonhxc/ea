import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { requireUser, getSupabaseAdmin, isAdminEmail } from "@/lib/supabase-server";
import { ApplicantProfileSchema } from "@/lib/schema";
import { extractProfileWithAI } from "@/lib/profile-ai";
import { evaluateProfileWithAI } from "@/lib/ai-scoring";
import { predict } from "@/lib/admissions";
import { buildRecommendations } from "@/lib/recommendations";
import { monteCarlo, validatePlan, optimizeEarly, rulesForSchool } from "@/lib/simulator";
import { deepseekChat } from "@/lib/deepseek";
import { matchOpportunities, getOpportunity, catalogStats } from "@/lib/opportunities";
import { generateRoadmapWithAI } from "@/lib/roadmap-ai";
import { generateOriginalProjects } from "@/lib/project-planner-ai";
import highSchools from "@/data/high-schools.json";
import schoolCatalog from "@/data/schools.json";

export const runtime="nodejs";
const ok=data=>NextResponse.json(data);
const fail=(message,status=400)=>NextResponse.json({error:message},{status});
function profileFingerprint(profile,primary,secondary){
  const {us_rank_cap:_,include_liberal_arts_colleges:__,...applicantProfile}=profile||{};
  const stable=JSON.stringify({profile:applicantProfile,primary:primary||profile?.primary_major||null,secondary:secondary||profile?.secondary_major||null});
  return createHash("sha256").update(stable).digest("hex").slice(0,24);
}

async function overrides(supabase){const {data}=await supabase.from("school_overrides").select("school_name,data");return data||[]}
async function highSchoolOverrides(supabase){const {data}=await supabase.from("high_school_outcome_overrides").select("high_school_id,data,source_url,source_year,verified");return data||[]}
function resolveHighSchool(profile){
  if(profile.high_school_id&&highSchools.some(h=>h.id===profile.high_school_id))return profile;
  const normalize=v=>String(v||"").normalize("NFKC").trim().toLowerCase().replace(/[\s·._-]+/g,"");
  const q=normalize(profile.high_school_name);if(!q)return profile;
  const names=h=>[h.name,h.name_zh,...(h.aliases||[])].filter(Boolean);
  const exact=highSchools.find(h=>names(h).some(n=>normalize(n)===q));
  const fuzzy=exact||highSchools.find(h=>names(h).some(n=>{const x=normalize(n);return x.length>=2&&(x.includes(q)||q.includes(x));}));
  return fuzzy?{...profile,high_school_id:fuzzy.id,high_school_name:fuzzy.name,school_country:fuzzy.country}:profile;
}

function enrichPlan(plan){
  const s=schoolCatalog.find(x=>x.name===plan.school_name);
  return {...plan,country:plan.country||s?.country||null,rank:Number.isFinite(Number(plan.rank))?Number(plan.rank):(s?.rank||999)};
}

async function aiAssessment(profile,major){
  if(!process.env.DEEPSEEK_API_KEY)return {assessment:null,status:"disabled",error:"AI analysis is not configured."};
  try{return {assessment:await evaluateProfileWithAI(profile,major),status:"ok",error:null}}
  catch(e){console.error("AI holistic scoring fallback:",e);return {assessment:null,status:"fallback",error:"AI analysis was unavailable; the deterministic model was used."}}
}

export async function POST(request){
  try{
    const body=await request.json();const action=String(body.action||"");const user=await requireUser(request);const supabase=getSupabaseAdmin();const admin=isAdminEmail(user.email);

    if(action==="me")return ok({user:{id:user.id,email:user.email},is_admin:admin,catalog:{high_schools:highSchools.length,...catalogStats()}});
    if(action==="bootstrap"){
      const [profileRow,plansRow,savedRow,roadmapRow,chatRow,latestRow]=await Promise.all([
        supabase.from("profiles").select("profile,updated_at").eq("user_id",user.id).maybeSingle(),
        supabase.from("application_plans").select("*").eq("user_id",user.id).order("created_at"),
        supabase.from("saved_opportunities").select("*").eq("user_id",user.id).order("created_at"),
        supabase.from("roadmap_items").select("*").eq("user_id",user.id).order("created_at"),
        supabase.from("conversation_messages").select("id,role,content,metadata,created_at").eq("user_id",user.id).eq("thread_key",body.thread_key||"advisor").order("created_at",{ascending:false}).limit(100),
        supabase.from("prediction_runs").select("result,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle()
      ]);
      for(const r of [profileRow,plansRow,savedRow,roadmapRow,chatRow,latestRow])if(r.error)throw r.error;
      return ok({
        is_admin:admin,
        profile:profileRow.data?.profile||null,
        plans:(plansRow.data||[]).map(enrichPlan),
        saved_opportunities:(savedRow.data||[]).map(x=>({...x,opportunity:getOpportunity(x.opportunity_id)})),
        roadmap:roadmapRow.data||[],
        messages:chatRow.data||[],
        predictions:latestRow.data?.result||null,
        prediction_created_at:latestRow.data?.created_at||null
      });
    }
    if(action==="load_profile"){
      const {data}=await supabase.from("profiles").select("profile,updated_at").eq("user_id",user.id).maybeSingle();return ok({profile:data?.profile||null,updated_at:data?.updated_at||null});
    }
    if(action==="latest_prediction"){
      const {data,error}=await supabase.from("prediction_runs").select("result,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return ok({predictions:data?.result||null,created_at:data?.created_at||null});
    }
    if(action==="save_profile"){
      const profile=resolveHighSchool(ApplicantProfileSchema.parse(body.profile));const {error}=await supabase.from("profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()});if(error)throw error;return ok({saved:true,profile});
    }
    if(action==="analyze"){
      const text=String(body.text||"").trim(),ageBand=String(body.age_band||"unknown");if(ageBand==="under_13")return fail("This app does not process profile data for users under 13.");if(text.length<20)return fail("Please provide a more complete applicant description.");if(text.length>25000)return fail("Profile text is too long.");
      const configPromise=Promise.all([overrides(supabase),highSchoolOverrides(supabase)]);
      let profile=resolveHighSchool(await extractProfileWithAI(text,ageBand));
      const [ai,[ovs,hsovs]]=await Promise.all([aiAssessment(profile,profile.primary_major||"Undeclared"),configPromise]);
      const predictions=predict(profile,profile.primary_major,profile.secondary_major,ovs,ai.assessment,hsovs);
      predictions.ai_status=ai.status;predictions.ai_error=ai.error;predictions.profile_fingerprint=profileFingerprint(profile,profile.primary_major,profile.secondary_major);
      await supabase.from("profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()});await supabase.from("prediction_runs").insert({user_id:user.id,primary_major:predictions.primary_major,secondary_major:predictions.secondary_major,result:predictions});return ok({profile,predictions});
    }
    if(action==="predict"){
      const profile=resolveHighSchool(ApplicantProfileSchema.parse(body.profile));const primary=body.primary_major||profile.primary_major,secondary=body.secondary_major||profile.secondary_major;const fp=profileFingerprint(profile,primary,secondary);
      const configPromise=Promise.all([overrides(supabase),highSchoolOverrides(supabase)]);let ai={assessment:null,status:"disabled",error:null};
      if(body.use_ai!==false){
        const {data:latest}=await supabase.from("prediction_runs").select("result").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
        if(latest?.result?.profile_fingerprint===fp&&latest.result.ai_assessment){ai={assessment:latest.result.ai_assessment,status:"cached",error:null};}
        else ai=await aiAssessment(profile,primary);
      }
      const [ovs,hsovs]=await configPromise;const predictions=predict(profile,primary,secondary,ovs,ai.assessment,hsovs);predictions.ai_status=ai.status;predictions.ai_error=ai.error;predictions.profile_fingerprint=fp;
      const savedProfile=await supabase.from("profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()});if(savedProfile.error)throw savedProfile.error;
      await supabase.from("prediction_runs").insert({user_id:user.id,primary_major:predictions.primary_major,secondary_major:predictions.secondary_major,result:predictions});return ok({predictions,profile});
    }
    if(action==="recommend"){
      const profile=ApplicantProfileSchema.parse(body.profile);return ok({recommendations:buildRecommendations(profile,body.primary_major||profile.primary_major,body.predictions)});
    }

    if(action==="opportunities"){
      const profile=ApplicantProfileSchema.parse(body.profile);return ok({items:matchOpportunities(profile,{kind:body.kind||"all",query:body.query||"",limit:body.limit||80}),stats:catalogStats()});
    }
    if(action==="generate_projects"){
      const profile=ApplicantProfileSchema.parse(body.profile);const projects=await generateOriginalProjects({profile,predictions:body.predictions,language:body.language||"auto"});return ok({projects});
    }
    if(action==="list_saved_opportunities"){
      const {data,error}=await supabase.from("saved_opportunities").select("*").eq("user_id",user.id).order("created_at");if(error)throw error;return ok({items:(data||[]).map(x=>({...x,opportunity:getOpportunity(x.opportunity_id)}))});
    }
    if(action==="save_opportunity"){
      const oid=String(body.opportunity_id||"");if(!getOpportunity(oid))return fail("Unknown opportunity.");const payload={user_id:user.id,opportunity_id:oid,status:body.status||"Considering",notes:body.notes||null,updated_at:new Date().toISOString()};const {data,error}=await supabase.from("saved_opportunities").upsert(payload,{onConflict:"user_id,opportunity_id"}).select().single();if(error)throw error;return ok({item:{...data,opportunity:getOpportunity(oid)}});
    }
    if(action==="delete_saved_opportunity"){
      const {error}=await supabase.from("saved_opportunities").delete().eq("user_id",user.id).eq("opportunity_id",body.opportunity_id);if(error)throw error;return ok({deleted:true});
    }

    if(action==="list_roadmap"){
      const {data,error}=await supabase.from("roadmap_items").select("*").eq("user_id",user.id).order("created_at");if(error)throw error;return ok({items:data||[]});
    }
    if(action==="save_roadmap_item"){
      const x=body.item||{};const payload={user_id:user.id,title:String(x.title||"").trim(),item_type:x.item_type||"task",due_date:x.due_date||null,due_window:x.due_window||null,priority:x.priority||"medium",status:x.status||"todo",why:x.why||null,success_metric:x.success_metric||null,source_id:x.source_id||null,updated_at:new Date().toISOString()};if(!payload.title)return fail("Roadmap item title is required.");let r=x.id?await supabase.from("roadmap_items").update(payload).eq("id",x.id).eq("user_id",user.id).select().single():await supabase.from("roadmap_items").insert(payload).select().single();if(r.error)throw r.error;return ok({item:r.data});
    }
    if(action==="delete_roadmap_item"){
      const {error}=await supabase.from("roadmap_items").delete().eq("id",body.id).eq("user_id",user.id);if(error)throw error;return ok({deleted:true});
    }
    if(action==="clear_stale_roadmap"){
      const currentMonth=new Date().toISOString().slice(0,7);
      const {error}=await supabase.from("roadmap_items").delete().eq("user_id",user.id).neq("status","done").lt("due_window",currentMonth);if(error)throw error;
      const {data,error:reloadError}=await supabase.from("roadmap_items").select("*").eq("user_id",user.id).order("created_at");if(reloadError)throw reloadError;return ok({items:data||[]});
    }
    if(action==="generate_roadmap"){
      const profile=ApplicantProfileSchema.parse(body.profile);const matched=matchOpportunities(profile,{limit:20});const {data:existing}=await supabase.from("roadmap_items").select("*").eq("user_id",user.id);const roadmap=await generateRoadmapWithAI({profile,predictions:body.predictions,opportunities:matched,existing:existing||[],language:body.language||"auto"});return ok({roadmap,matched:matched.slice(0,12)});
    }
    if(action==="accept_roadmap"){
      const items=Array.isArray(body.items)?body.items.slice(0,20):[];if(!items.length)return fail("No roadmap items supplied.");const rows=items.map(x=>({user_id:user.id,title:String(x.title||"Action"),item_type:x.type||x.item_type||"task",due_window:x.due_window||null,priority:x.priority||"medium",status:"todo",why:x.why||null,success_metric:x.success_metric||null,source_id:x.source_id||null}));const {data,error}=await supabase.from("roadmap_items").insert(rows).select();if(error)throw error;return ok({items:data||[]});
    }

    if(action==="chat_history"){
      const {data,error}=await supabase.from("conversation_messages").select("id,role,content,metadata,created_at").eq("user_id",user.id).eq("thread_key",body.thread_key||"advisor").order("created_at",{ascending:false}).limit(100);if(error)throw error;return ok({messages:data||[]});
    }
    if(action==="counsel"){
      const question=String(body.question||"").trim();if(!question)return fail("Question is required.");const thread=body.thread_key||"advisor";const clientId=String(body.client_id||randomUUID()).slice(0,120);
      const [{data:history},{data:roadmap}]=await Promise.all([supabase.from("conversation_messages").select("role,content").eq("user_id",user.id).eq("thread_key",thread).order("created_at",{ascending:false}).limit(18),supabase.from("roadmap_items").select("title,status,priority,due_window,why,success_metric").eq("user_id",user.id).limit(30)]);
      const prior=(history||[]).reverse();
      // Persist the user's turn before calling the model. If the browser closes mid-generation, the question still survives.
      const existingUser=await supabase.from("conversation_messages").select("id,role,content,metadata,created_at").eq("user_id",user.id).eq("thread_key",thread).contains("metadata",{client_id:clientId}).eq("role","user").limit(1).maybeSingle();
      let userMessage=existingUser.data||null;
      if(!userMessage){const inserted=await supabase.from("conversation_messages").insert({user_id:user.id,thread_key:thread,role:"user",content:question,metadata:{source:"client",client_id:clientId,status:"received"}}).select("id,role,content,metadata,created_at").single();if(inserted.error)throw inserted.error;userMessage=inserted.data;}
      // Idempotency: if this client turn already has a completed reply, return it instead of generating a duplicate.
      const existingAssistant=await supabase.from("conversation_messages").select("id,role,content,metadata,created_at").eq("user_id",user.id).eq("thread_key",thread).contains("metadata",{reply_to:clientId}).eq("role","assistant").limit(1).maybeSingle();
      if(existingAssistant.data)return ok({answer:existingAssistant.data.content,client_id:clientId,user_message:userMessage,assistant_message:existingAssistant.data,reused:true});
      const context=`Applicant profile:
${JSON.stringify(body.profile||{})}

UniPath prediction engine output:
${JSON.stringify(body.predictions||{})}

Saved application plans:
${JSON.stringify(body.plans||[])}

Current roadmap:
${JSON.stringify(roadmap||[])}`;
      const lang=body.language==="zh"?"Respond in Simplified Chinese.":body.language==="en"?"Respond in English.":"Respond in the user's language.";
      const answer=await deepseekChat([{role:"system",content:`You are UniPath AI Advisor, a persistent student-facing university-planning counselor. Be concrete, critical and action-oriented. Use only probability intervals supplied by UniPath; never invent admissions percentages. Distinguish completed work from future plans. Prefer depth, evidence and fit over prestige collecting. When suggesting summer programs, research, competitions or projects, explain the role they play in the student's strategy. Do not infer sensitive traits. Keep continuity with prior conversation. ${lang}`},{role:"system",content:context},...prior.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content})),{role:"user",content:question}],{temperature:.12,max_tokens:2600,thinking:false});
      const inserted=await supabase.from("conversation_messages").insert({user_id:user.id,thread_key:thread,role:"assistant",content:answer,metadata:{source:"ai",reply_to:clientId,status:"complete"}}).select("id,role,content,metadata,created_at").single();if(inserted.error)throw inserted.error;
      return ok({answer,client_id:clientId,user_message:userMessage,assistant_message:inserted.data});
    }
    if(action==="clear_chat"){
      const {error}=await supabase.from("conversation_messages").delete().eq("user_id",user.id).eq("thread_key",body.thread_key||"advisor");if(error)throw error;return ok({deleted:true});
    }

    if(action==="list_plans"){
      const {data,error}=await supabase.from("application_plans").select("*").eq("user_id",user.id).order("created_at");if(error)throw error;return ok({plans:(data||[]).map(enrichPlan)});
    }
    if(action==="save_plan"){
      const item=body.plan||{};
      const payload={user_id:user.id,school_name:String(item.school_name||""),program:item.program||null,major:item.major||null,round:item.round||"RD",probability:Number(item.probability)||null,probability_min:Number(item.probability_min)||null,probability_max:Number(item.probability_max)||null,tier:item.tier||null,status:item.status||"Planning",notes:item.notes||null,updated_at:new Date().toISOString()};
      if(!payload.school_name)return fail("School name is required.");
      let targetId=item.id&&!String(item.id).startsWith("draft-")?item.id:null;
      if(!targetId){const {data:existing}=await supabase.from("application_plans").select("id").eq("user_id",user.id).eq("school_name",payload.school_name).limit(1).maybeSingle();targetId=existing?.id||null;}
      const r=targetId?await supabase.from("application_plans").update(payload).eq("id",targetId).eq("user_id",user.id).select().single():await supabase.from("application_plans").insert(payload).select().single();
      if(r.error)throw r.error;return ok({plan:enrichPlan(r.data)});
    }
    if(action==="save_plan_batch"){
      const items=Array.isArray(body.plans)?body.plans.slice(0,20):[];if(!items.length)return fail("No schools supplied.");
      const {data:existing,error:existingError}=await supabase.from("application_plans").select("*").eq("user_id",user.id);if(existingError)throw existingError;
      const byName=new Map((existing||[]).map(x=>[x.school_name,x]));
      for(const item of items){
        const school_name=String(item.school_name||"").trim();if(!school_name)continue;
        const payload={user_id:user.id,school_name,program:item.program||null,major:item.major||null,round:item.round||"RD",probability:Number(item.probability)||null,probability_min:Number(item.probability_min)||null,probability_max:Number(item.probability_max)||null,tier:item.tier||null,status:item.status||"Planning",notes:item.notes||null,updated_at:new Date().toISOString()};
        const prior=byName.get(school_name);const r=prior?await supabase.from("application_plans").update(payload).eq("id",prior.id).eq("user_id",user.id):await supabase.from("application_plans").insert(payload);if(r.error)throw r.error;
      }
      const {data,error}=await supabase.from("application_plans").select("*").eq("user_id",user.id).order("created_at");if(error)throw error;return ok({plans:(data||[]).map(enrichPlan)});
    }
    if(action==="sync_plans"){
      const modeled=Array.isArray(body.predictions?.schools)?body.predictions.schools:[];
      const map=new Map(modeled.map(x=>[x.school,x]));
      const {data:current,error}=await supabase.from("application_plans").select("*").eq("user_id",user.id);if(error)throw error;
      for(const plan of current||[]){const row=map.get(plan.school_name);if(!row)continue;const patch={program:row.program||plan.program,major:row.major||plan.major,probability:Number(row.probability)||plan.probability,probability_min:Number(row.interval?.[0])||plan.probability_min,probability_max:Number(row.interval?.[1])||plan.probability_max,tier:row.tier||plan.tier,updated_at:new Date().toISOString()};const r=await supabase.from("application_plans").update(patch).eq("id",plan.id).eq("user_id",user.id);if(r.error)throw r.error;}
      const {data,error:reloadError}=await supabase.from("application_plans").select("*").eq("user_id",user.id).order("created_at");if(reloadError)throw reloadError;return ok({plans:(data||[]).map(enrichPlan)});
    }
    if(action==="delete_plan"){const {error}=await supabase.from("application_plans").delete().eq("id",body.id).eq("user_id",user.id);if(error)throw error;return ok({deleted:true})}
    if(action==="round_rules")return ok({rules:rulesForSchool(body.school_name,body.country)});
    if(action==="validate_strategy")return ok(validatePlan(body.plans||[]));
    if(action==="optimize_strategy")return ok({strategy:optimizeEarly(body.plans||[]),validation:validatePlan(body.plans||[])});
    if(action==="simulate"){const plans=body.plans||[],validation=validatePlan(plans);if(validation.errors.length)return fail(validation.errors.join(" "));const simulation=monteCarlo(plans,body.runs||1000);return ok({simulation,example_cycle:simulation.visible_cycle,validation})}
    if(action==="history"){const {data,error}=await supabase.from("prediction_runs").select("id,primary_major,secondary_major,created_at,result").eq("user_id",user.id).order("created_at",{ascending:false}).limit(12);if(error)throw error;return ok({runs:data||[]})}
    if(action==="feedback"){const message=String(body.message||"").trim();if(!message)return fail("Feedback is empty.");const {error}=await supabase.from("feedback").insert({user_id:user.id,message});if(error)throw error;return ok({saved:true})}

    if(action==="admin_stats"){
      if(!admin)return fail("Admin access required.",403);const [profiles,plans,runs,feedback,ovs,hsovs,roadmap,chat,saved]=await Promise.all([supabase.from("profiles").select("*",{count:"exact",head:true}),supabase.from("application_plans").select("*",{count:"exact",head:true}),supabase.from("prediction_runs").select("*",{count:"exact",head:true}),supabase.from("feedback").select("*",{count:"exact",head:true}),supabase.from("school_overrides").select("school_name,data,updated_at").order("school_name"),supabase.from("high_school_outcome_overrides").select("*").order("high_school_id"),supabase.from("roadmap_items").select("*",{count:"exact",head:true}),supabase.from("conversation_messages").select("*",{count:"exact",head:true}),supabase.from("saved_opportunities").select("*",{count:"exact",head:true})]);return ok({stats:{profiles:profiles.count||0,plans:plans.count||0,runs:runs.count||0,feedback:feedback.count||0,roadmap:roadmap.count||0,chat:chat.count||0,saved_opportunities:saved.count||0},overrides:ovs.data||[],high_school_overrides:hsovs.data||[],catalog:{universities:schoolCatalog.length,high_schools:highSchools.length,...catalogStats()}});
    }
    if(action==="admin_save_override"){
      if(!admin)return fail("Admin access required.",403);const schoolName=String(body.school_name||"").trim();if(!schoolName)return fail("School name is required.");const data=typeof body.data==="object"&&body.data?body.data:{};const {error}=await supabase.from("school_overrides").upsert({school_name:schoolName,data,updated_by:user.id,updated_at:new Date().toISOString()});if(error)throw error;return ok({saved:true});
    }
    if(action==="admin_save_high_school_override"){
      if(!admin)return fail("Admin access required.",403);const id=String(body.high_school_id||"").trim();if(!id)return fail("High school id is required.");const {error}=await supabase.from("high_school_outcome_overrides").upsert({high_school_id:id,data:body.data||{},source_url:body.source_url||null,source_year:body.source_year||null,verified:!!body.verified,updated_by:user.id,updated_at:new Date().toISOString()});if(error)throw error;return ok({saved:true});
    }
    if(action==="admin_seed_demo_accounts"){
      if(!admin)return fail("Admin access required.",403);const password=String(body.password||"");if(password.length<10)return fail("Use a demo password with at least 10 characters.");
      const accounts=[1,2,3,4,5].map(n=>({email:`unipath.demo${n}@example.com`,password}));const results=[];
      const listed=await supabase.auth.admin.listUsers({page:1,perPage:1000});const existing=new Map((listed.data?.users||[]).map(u=>[u.email,u]));
      for(const a of accounts){let u=existing.get(a.email);if(!u){const r=await supabase.auth.admin.createUser({email:a.email,password:a.password,email_confirm:true,user_metadata:{unipath_demo:true}});if(r.error){results.push({email:a.email,status:"error",message:r.error.message});continue}u=r.data.user;}else{await supabase.auth.admin.updateUserById(u.id,{password:a.password,email_confirm:true,user_metadata:{...(u.user_metadata||{}),unipath_demo:true}})}results.push({email:a.email,status:"ready"});}
      return ok({accounts:results.map(x=>({...x,password:x.status==="ready"?password:undefined})),note:"Demo accounts are ordinary non-admin Supabase users. Change or delete them after testing if desired."});
    }
    return fail("Unknown action.");
  }catch(error){
    console.error("UniPath API error:",error);
    if(error?.message==="AUTH_REQUIRED")return fail("Please log in.",401);
    if(error?.name==="ZodError" || Array.isArray(error?.issues)){
      return fail("AI returned profile fields in an unsupported format. Please retry; UniPath now normalizes common enum and output-format variations.",422);
    }
    const rawMessage=String(error?.message||"Request failed.");
    const publicMessage=/deepseek|github models|model provider/i.test(rawMessage)
      ? "AI analysis could not complete. Please retry in a moment."
      : rawMessage;
    return fail(publicMessage,500);
  }
}
