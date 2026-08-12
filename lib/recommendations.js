import { scoreProfile } from "@/lib/admissions";

export function buildRecommendations(profile, majorText, predictions) {
  const s = scoreProfile(profile,majorText);
  const academic=[],activities=[],application=[];

  if (s.academic < 88) {
    if (!profile.sat && !profile.act) academic.push({priority:"high",title:"Add a strong standardized-test signal",detail:"If testing is accepted and a competitive score is realistic, it can reduce uncertainty in the academic profile."});
    if (profile.academic_rigor !== "highest") academic.push({priority:"high",title:"Increase course rigor where appropriate",detail:"Prioritize the hardest courses that are relevant to the intended field without sacrificing transcript stability."});
  } else {
    academic.push({priority:"low",title:"Protect transcript consistency",detail:"Your academic profile is already strong; avoid adding marginal difficulty that risks grades without strengthening major preparation."});
  }

  if (["humanities","social"].includes(s.category)) {
    if (profile.writing_preparation !== "strong") academic.push({priority:"high",title:"Strengthen reading and writing evidence",detail:"Humanities/social-science applicants benefit more from sustained analytical writing, advanced humanities courses, publication, research writing, or serious independent work than from extra STEM signaling."});
    activities.push({priority:"medium",title:"Build a visible intellectual theme",detail:"Connect reading, research, publication, journalism, advocacy, archival work, debate, policy, or community work around a coherent question rather than chasing unrelated awards."});
  }

  if (["engineering","computing","natural"].includes(s.category)) {
    if (profile.quantitative_preparation !== "strong") academic.push({priority:"high",title:"Close quantitative prerequisites",detail:"Strengthen math/science preparation directly tied to the intended field."});
    if ((profile.distinctive_outputs || []).length < 1) activities.push({priority:"high",title:"Create a flagship technical output",detail:"A paper, prototype, dataset, software project, validated experiment, competition engineering result, or real-world deployment creates stronger evidence than another generic club."});
  }

  if (s.category === "arts") {
    activities.push({priority:"high",title:"Treat portfolio quality as the primary spike",detail:"Focus on a coherent body of work, external review, performances/exhibitions/publication, and technical development rather than generic leadership."});
  }

  const sustained = (profile.activities || []).filter(a => (a.years || 0)>=2).length;
  const outcomes = (profile.activities || []).filter(a => a.measurable_outcome).length;
  const leadership = (profile.activities || []).filter(a => /founder|president|captain|lead|editor|director|chair/i.test(a.role || "")).length;

  if (sustained < 2) activities.push({priority:"high",title:"Increase continuity",detail:"At least two activities should show sustained commitment across multiple semesters rather than short one-off participation."});
  if (outcomes < 2) activities.push({priority:"high",title:"Make outcomes measurable",detail:"Convert participation into evidence: users reached, publication, adoption, performance result, prototype validation, money raised, people served, research output, or documented change."});
  if (leadership < 1 && !["arts"].includes(s.category)) activities.push({priority:"medium",title:"Increase ownership",detail:"Leadership does not need a title; taking responsibility for a meaningful project, team, publication, research direction, or community outcome is more important."});
  if ((profile.activities || []).length > 8 && s.activities < 78) activities.push({priority:"medium",title:"Reduce breadth without depth",detail:"A long activity list is not automatically stronger. Concentrate time on the few experiences with the highest ownership, continuity, and output."});

  const rows = predictions?.schools || [];
  const likely = rows.filter(x=>x.tier==="Likely").length;
  const target = rows.filter(x=>x.tier==="Target").length;
  const hard = rows.filter(x=>["Lottery","Super Reach","Reach"].includes(x.tier)).length;

  if (rows.length && likely+target < 3) application.push({priority:"high",title:"Add lower-risk schools",detail:"Your current modeled list is too top-heavy. Add schools you would genuinely attend, not fake safeties."});
  if (rows.length && hard/rows.length > .7) application.push({priority:"high",title:"Reduce portfolio risk",detail:"More than 70% of the modeled list is Reach-or-harder. Rebalance before optimizing ED."});
  if (profile.aid_need === "high" && ["china_international","other_international"].includes(profile.applicant_type)) application.push({priority:"high",title:"Build an aid-aware list",detail:"For international applicants needing substantial aid, admission risk and affordability must be planned together."});

  application.push({priority:"medium",title:"Use ED only when it is truly first choice",detail:"Do not choose a binding plan solely because the raw ED admit rate looks higher. Compare fit, affordability, profile readiness, and the opportunity cost of giving up other early options."});

  return {scores:s,academic,activities,application};
}
