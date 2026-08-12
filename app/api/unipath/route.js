import { NextResponse } from "next/server";
import { requireUser, getSupabaseAdmin, isAdminEmail } from "@/lib/supabase-server";
import { ApplicantProfileSchema } from "@/lib/schema";
import { extractProfileWithAI } from "@/lib/profile-ai";
import { predict } from "@/lib/admissions";
import { buildRecommendations } from "@/lib/recommendations";
import { monteCarlo, validatePlan, optimizeEarly, rulesForSchool } from "@/lib/simulator";
import { githubChat, githubModelName } from "@/lib/github-models";

export const runtime = "nodejs";

function ok(data){ return NextResponse.json(data); }
function fail(message,status=400){ return NextResponse.json({error:message},{status}); }

async function overrides(supabase) {
  const {data}=await supabase.from("school_overrides").select("school_name,data");
  return data || [];
}

export async function POST(request) {
  try {
    const body=await request.json();
    const action=String(body.action||"");
    const user=await requireUser(request);
    const supabase=getSupabaseAdmin();
    const admin=isAdminEmail(user.email);

    if (action==="me") return ok({user:{id:user.id,email:user.email},is_admin:admin,model:githubModelName()});

    if (action==="load_profile") {
      const {data}=await supabase.from("profiles").select("profile,updated_at").eq("user_id",user.id).maybeSingle();
      return ok({profile:data?.profile || null,updated_at:data?.updated_at || null});
    }

    if (action==="save_profile") {
      const profile=ApplicantProfileSchema.parse(body.profile);
      const {error}=await supabase.from("profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()});
      if (error) throw error;
      return ok({saved:true,profile});
    }

    if (action==="analyze") {
      const text=String(body.text||"").trim();
      const ageBand=String(body.age_band||"unknown");
      if (ageBand==="under_13") return fail("This MVP does not process profile data for users under 13.");
      if (text.length<20) return fail("Please provide a more complete applicant description.");
      if (text.length>20000) return fail("Profile text is too long.");
      const profile=await extractProfileWithAI(text,ageBand);
      const ovs=await overrides(supabase);
      const predictions=predict(profile,body.primary_major||profile.primary_major,body.secondary_major||profile.secondary_major,ovs);
      await supabase.from("profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()});
      await supabase.from("prediction_runs").insert({user_id:user.id,primary_major:predictions.primary_major,secondary_major:predictions.secondary_major,result:predictions});
      return ok({profile,predictions});
    }

    if (action==="predict") {
      const profile=ApplicantProfileSchema.parse(body.profile);
      const ovs=await overrides(supabase);
      const predictions=predict(profile,body.primary_major,body.secondary_major,ovs);
      await supabase.from("prediction_runs").insert({user_id:user.id,primary_major:predictions.primary_major,secondary_major:predictions.secondary_major,result:predictions});
      return ok({predictions});
    }

    if (action==="recommend") {
      const profile=ApplicantProfileSchema.parse(body.profile);
      return ok({recommendations:buildRecommendations(profile,body.primary_major||profile.primary_major,body.predictions)});
    }

    if (action==="counsel") {
      const question=String(body.question||"").trim();
      if (!question) return fail("Question is required.");
      const answer=await githubChat([
        {role:"system",content:
          "You are UniPath AI Counselor. Be concrete and critical. Use ONLY the supplied UniPath probability intervals when discussing admissions chances; never invent new percentages. Explain school/major fit, second-major strategy, ED/EA/RD tradeoffs, academics, activities and risk. Distinguish completed achievements from plans. If a second major is only a loophole and is not supported by the profile, say so. Be equally competent for STEM, humanities, social sciences, business and arts applicants. Respond in the user's language."},
        {role:"user",content:
          "Applicant profile:\n"+JSON.stringify(body.profile||{})+
          "\n\nUniPath predictions:\n"+JSON.stringify(body.predictions||{})+
          "\n\nSaved application plans:\n"+JSON.stringify(body.plans||[])+
          "\n\nQuestion:\n"+question}
      ],{temperature:.2,max_tokens:2600});
      return ok({answer});
    }

    if (action==="list_plans") {
      const {data,error}=await supabase.from("application_plans").select("*").eq("user_id",user.id).order("created_at");
      if (error) throw error;
      return ok({plans:data||[]});
    }

    if (action==="save_plan") {
      const item=body.plan||{};
      const payload={
        user_id:user.id,
        school_name:String(item.school_name||""),
        program:item.program||null,
        major:item.major||null,
        round:item.round||"RD",
        probability:Number(item.probability)||null,
        probability_min:Number(item.probability_min)||null,
        probability_max:Number(item.probability_max)||null,
        tier:item.tier||null,
        status:item.status||"Planning",
        notes:item.notes||null,
        updated_at:new Date().toISOString()
      };
      if (!payload.school_name) return fail("School name is required.");
      let result;
      if (item.id) result=await supabase.from("application_plans").update(payload).eq("id",item.id).eq("user_id",user.id).select().single();
      else result=await supabase.from("application_plans").insert(payload).select().single();
      if (result.error) throw result.error;
      return ok({plan:result.data});
    }

    if (action==="delete_plan") {
      const {error}=await supabase.from("application_plans").delete().eq("id",body.id).eq("user_id",user.id);
      if (error) throw error;
      return ok({deleted:true});
    }

    if (action==="round_rules") {
      return ok({rules:rulesForSchool(body.school_name,body.country)});
    }

    if (action==="validate_strategy") {
      return ok(validatePlan(body.plans||[]));
    }

    if (action==="optimize_strategy") {
      return ok({strategy:optimizeEarly(body.plans||[]),validation:validatePlan(body.plans||[])});
    }

    if (action==="simulate") {
      const plans=body.plans||[];
      const validation=validatePlan(plans);
      if (validation.errors.length) return fail(validation.errors.join(" "));
      return ok({simulation:monteCarlo(plans,body.runs||1000),validation});
    }

    if (action==="history") {
      const {data,error}=await supabase.from("prediction_runs").select("id,primary_major,secondary_major,created_at,result").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10);
      if (error) throw error;
      return ok({runs:data||[]});
    }

    if (action==="feedback") {
      const message=String(body.message||"").trim();
      if (!message) return fail("Feedback is empty.");
      const {error}=await supabase.from("feedback").insert({user_id:user.id,message});
      if (error) throw error;
      return ok({saved:true});
    }

    if (action==="admin_stats") {
      if (!admin) return fail("Admin access required.",403);
      const [profiles,plans,runs,feedback,ovs]=await Promise.all([
        supabase.from("profiles").select("*",{count:"exact",head:true}),
        supabase.from("application_plans").select("*",{count:"exact",head:true}),
        supabase.from("prediction_runs").select("*",{count:"exact",head:true}),
        supabase.from("feedback").select("*",{count:"exact",head:true}),
        supabase.from("school_overrides").select("school_name,data,updated_at").order("school_name")
      ]);
      return ok({stats:{profiles:profiles.count||0,plans:plans.count||0,runs:runs.count||0,feedback:feedback.count||0},overrides:ovs.data||[],model:githubModelName()});
    }

    if (action==="admin_save_override") {
      if (!admin) return fail("Admin access required.",403);
      const schoolName=String(body.school_name||"").trim();
      if (!schoolName) return fail("School name is required.");
      const data=typeof body.data==="object"&&body.data?body.data:{};
      const {error}=await supabase.from("school_overrides").upsert({school_name:schoolName,data,updated_by:user.id,updated_at:new Date().toISOString()});
      if (error) throw error;
      return ok({saved:true});
    }

    if (action==="admin_delete_override") {
      if (!admin) return fail("Admin access required.",403);
      const {error}=await supabase.from("school_overrides").delete().eq("school_name",body.school_name);
      if (error) throw error;
      return ok({deleted:true});
    }

    return fail("Unknown action.");
  } catch(error) {
    console.error("UniPath API error:",error);
    if (error?.message==="AUTH_REQUIRED") return fail("Please log in.",401);
    return fail(error?.message || "Request failed.",500);
  }
}
