const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,Number(x)||0));
const round=x=>Math.round(clamp(x));
const leadershipRe=/founder|president|captain|lead|director|editor|chair|creator|co-founder|创办|负责人|队长|主席|主编/i;
const researchRe=/research|survey|interview|experiment|study|paper|dataset|analysis|regression|archive|documentary|prototype|model|研究|调查|访谈|实验|论文|数据|纪录片|原型/i;
const communityRe=/service|volunteer|tutor|community|nonprofit|public|policy|advocacy|migrant|education|志愿|社区|公益|支教|政策/i;

function testingSignal(profile){
  if(profile.sat)return clamp((profile.sat-1180)/400*100);
  if(profile.act)return clamp((profile.act-23)/13*100);
  return 62;
}
function activityStats(profile){
  const acts=(profile.activities||[]).filter(a=>a.status!=="planned");
  const sustained=acts.filter(a=>(Number(a.years)||0)>=2).length;
  const leaders=acts.filter(a=>leadershipRe.test(a.role||"")).length;
  const measured=acts.filter(a=>a.measurable_outcome).length;
  const research=acts.filter(a=>researchRe.test(`${a.name||""} ${a.description||""} ${a.measurable_outcome||""}`)).length;
  const community=acts.filter(a=>communityRe.test(`${a.name||""} ${a.description||""}`)).length;
  const deepDescriptions=acts.filter(a=>(a.description||"").length>=120).length;
  const highScope=acts.filter(a=>["regional","national","international"].includes(a.impact_scope)).length;
  return {acts,sustained,leaders,measured,research,community,deepDescriptions,highScope};
}
function validationScore(profile,score,stats){
  const earned=(profile.awards||[]).filter(a=>a.status!=="planned");
  const strongAwards=earned.filter(a=>["national","international","elite"].includes(a.level)).length;
  const outputs=(profile.distinctive_outputs||[]).length;
  return clamp(42+Math.min(strongAwards,3)*11+Math.min(earned.length,5)*3+Math.min(outputs,4)*7+Math.min(stats.highScope,2)*4+(Number(score?.awards)||43)*.08-4);
}
function completeness(profile,score,ai){
  let points=0,total=12;
  if(profile.grade_band&&profile.grade_band!=="unknown")points++;
  if(profile.gpa_description)points++;
  if(profile.sat||profile.act)points++;
  if(profile.curriculum&&profile.curriculum!=="unknown")points++;
  if((profile.ap_courses?.length||0)+(profile.ib_courses?.length||0)+(profile.alevel_courses?.length||0)>=4)points++;
  if(profile.primary_major)points++;
  if((profile.activities||[]).length>=4)points++;
  if((profile.activities||[]).filter(a=>(a.description||"").length>=80).length>=2)points++;
  if((profile.activities||[]).filter(a=>a.measurable_outcome).length>=2)points++;
  if((profile.awards||[]).length>=1)points++;
  if((profile.distinctive_outputs||[]).length>=1)points++;
  if(ai?.confidence!=null||score?.course_fit?.confidence>=.5)points++;
  return Math.max(.38,Math.min(.94,.38+(points/total)*.56));
}
function level(score){return score>=88?"Exceptional":score>=80?"Strong":score>=70?"Competitive":score>=60?"Developing":"Limited evidence"}
function dim(id,label,score,evidence,why){return {id,label,score:round(score),level:level(score),evidence:(evidence||[]).filter(Boolean).slice(0,3),why}}

export function buildApplicantIntelligence(profile,majorText,score,ai=null){
  const stats=activityStats(profile);
  const course=score?.course_fit||{},ev=score?.evidence_fit||{};
  const testing=testingSignal(profile);
  const rigor=profile.academic_rigor==="highest"?94:profile.academic_rigor==="strong"?84:profile.academic_rigor==="average"?68:72;
  const validation=validationScore(profile,score,stats);
  const continuity=clamp(48+stats.sustained*13+Math.min(stats.acts.length,6)*3);
  const ownership=clamp(48+stats.leaders*13+stats.measured*4+stats.deepDescriptions*2);
  const researchDepth=clamp(48+stats.research*10+Math.min((profile.distinctive_outputs||[]).length,4)*6+(Number(ev.project_evidence)||55)*.16);
  const communityImpact=clamp(47+stats.community*8+stats.measured*4+stats.highScope*5);
  const coherence=ai?.activity_coherence??clamp((Number(ev.project_major_alignment)||65)*.55+(Number(ev.interdisciplinary_fit)||60)*.18+(Number(score?.activities)||65)*.27);
  const vitality=ai?.intellectual_vitality??clamp(researchDepth*.45+(Number(course.course_alignment)||65)*.25+(Number(score?.output)||55)*.20+ownership*.10);
  const independent=clamp(researchDepth*.42+ownership*.38+(Number(score?.output)||55)*.20);
  const leadership=clamp(45+stats.leaders*15+stats.highScope*6+Math.min(stats.measured,4)*4);
  const execution=clamp((Number(score?.activities)||60)*.38+(Number(score?.output)||50)*.27+continuity*.20+ownership*.15);
  const distinctiveness=clamp((Number(score?.output)||50)*.35+validation*.22+researchDepth*.23+(ai?.narrative_strength ?? (Number(score?.narrative)||65))*.20);
  const voice=ai?.narrative_strength ?? (Number(score?.narrative)||65);
  const alignment=clamp((Number(course.course_alignment)||65)*.44+(Number(ev.project_major_alignment)||65)*.42+(Number(ev.interdisciplinary_fit)||60)*.14);

  const clusters=[
    {id:"academic",label:"Academic readiness",score:round((Number(score?.academic)||70)*.55+rigor*.18+(Number(course.course_alignment)||65)*.18+testing*.09),dimensions:[
      dim("transcript","Transcript strength",Number(score?.academic)||70,[profile.gpa_description,profile.grade_band!=="unknown"?`Class context: ${profile.grade_band}`:null],"Grades, rank/context and testing remain the academic floor."),
      dim("rigor","Course rigor",rigor,[profile.academic_rigor!=="unknown"?`Rigor: ${profile.academic_rigor}`:null,course.coverage!=null?`Foundation coverage ${Math.round(course.coverage)}/100`:null],"Rigor is read in context and weighted toward courses that support the intended field."),
      dim("major_foundations","Major foundations",Number(course.course_alignment)||65,(course.course_breakdown||[]).sort((a,b)=>(b.relevance||0)-(a.relevance||0)).slice(0,2).map(x=>x.subject),"Subject-level preparation matters more than a raw count of advanced courses."),
      dim("testing","Testing signal",testing,[profile.sat?`SAT ${profile.sat}`:profile.act?`ACT ${profile.act}`:"No SAT/ACT signal entered"],"Testing is supporting evidence, not a substitute for transcript strength.")
    ]},
    {id:"intellectual",label:"Intellectual profile",score:round(vitality*.38+researchDepth*.28+independent*.20+(Number(ev.interdisciplinary_fit)||60)*.14),dimensions:[
      dim("vitality","Intellectual vitality",vitality,ai?.strengths||[],"Looks for evidence that questions led to work beyond assigned coursework."),
      dim("research_depth","Research / inquiry depth",researchDepth,stats.acts.filter(a=>researchRe.test(`${a.name||""} ${a.description||""}`)).slice(0,2).map(a=>a.name),"Methods, iteration and finished analysis count more than the research label."),
      dim("independent","Independent thinking",independent,stats.acts.filter(a=>leadershipRe.test(a.role||"")).slice(0,2).map(a=>a.name),"Ownership is inferred from decisions, methods and responsibility—not titles alone."),
      dim("interdisciplinary","Interdisciplinary range",Number(ev.interdisciplinary_fit)||60,[ev.interdisciplinary_note],"Useful when a second lens deepens the primary field rather than creating random breadth.")
    ]},
    {id:"execution",label:"Execution & output",score:round(execution),dimensions:[
      dim("continuity","Sustained commitment",continuity,stats.acts.filter(a=>(Number(a.years)||0)>=2).slice(0,2).map(a=>`${a.name} · ${a.years} years`),"Sustained work is stronger evidence than a string of short activities."),
      dim("ownership","Ownership",ownership,stats.acts.filter(a=>leadershipRe.test(a.role||"")).slice(0,2).map(a=>`${a.name}${a.role?` · ${a.role}`:""}`),"The model rewards responsibility for direction and outcomes."),
      dim("outputs","Finished outputs",Number(score?.output)||50,(profile.distinctive_outputs||[]).slice(0,3),"A finished paper, prototype, dataset, performance or publication makes work auditable."),
      dim("validation","External validation",validation,(profile.awards||[]).filter(a=>a.status!=="planned").slice(0,3).map(a=>`${a.name} · ${a.level}`),"External validation is useful, but it is not required for every strong profile.")
    ]},
    {id:"impact",label:"Leadership & impact",score:round(leadership*.47+communityImpact*.33+ownership*.20),dimensions:[
      dim("leadership","Leadership",leadership,stats.acts.filter(a=>leadershipRe.test(a.role||"")).slice(0,3).map(a=>a.role?`${a.name} · ${a.role}`:a.name),"Leadership is treated as responsibility and decision-making, not just an office."),
      dim("community","Community contribution",communityImpact,stats.acts.filter(a=>communityRe.test(`${a.name||""} ${a.description||""}`)).slice(0,2).map(a=>a.name),"Contribution can be service, teaching, team-building, public work or institutional improvement."),
      dim("measurable_impact","Measurable impact",clamp(48+stats.measured*11+stats.highScope*6),stats.acts.filter(a=>a.measurable_outcome).slice(0,2).map(a=>a.measurable_outcome),"Concrete outcomes reduce the gap between participation and demonstrated effect.")
    ]},
    {id:"narrative",label:"Application narrative",score:round(coherence*.32+distinctiveness*.28+alignment*.25+voice*.15),dimensions:[
      dim("coherence","Coherence",coherence,[majorText?`Primary direction: ${majorText}`:null],"A coherent profile can contain breadth, but the strongest work should still point to understandable questions and motivations."),
      dim("distinctiveness","Distinctiveness",distinctiveness,(profile.distinctive_outputs||[]).slice(0,2),"Distinctiveness comes from the combination of question, method, responsibility and output—not from rare labels alone."),
      dim("major_alignment","Major alignment",alignment,[`Course fit ${Math.round(course.course_alignment||0)}/100`,`Project fit ${Math.round(ev.project_major_alignment||0)}/100`],"The intended field should be supported by both preparation and executed evidence."),
      dim("voice","Personal voice readiness",voice,[profile.essay_quality!=="unknown"?`Essay signal: ${profile.essay_quality}`:null,profile.recommendation_quality!=="unknown"?`Recommendation signal: ${profile.recommendation_quality}`:null],"This remains uncertain until actual writing and recommendations exist.")
    ]}
  ];

  const allDims=clusters.flatMap(c=>c.dimensions.map(d=>({...d,cluster:c.label})));
  const strongest=[...allDims].sort((a,b)=>b.score-a.score).slice(0,4).map(d=>({dimension:d.label,score:d.score,summary:d.evidence?.[0]||d.why}));
  const gaps=[...allDims].sort((a,b)=>a.score-b.score).slice(0,4).map(d=>({dimension:d.label,score:d.score,summary:d.why}));
  const topActivities=[...stats.acts].sort((a,b)=>{const av=(a.measurable_outcome?8:0)+(leadershipRe.test(a.role||"")?7:0)+(Number(a.years)||0)*2+(a.major_related?4:0);const bv=(b.measurable_outcome?8:0)+(leadershipRe.test(b.role||"")?7:0)+(Number(b.years)||0)*2+(b.major_related?4:0);return bv-av}).slice(0,3).map(a=>a.name).filter(Boolean);
  const identityParts=[majorText||profile.primary_major||"an emerging academic direction",topActivities[0],topActivities[1]].filter(Boolean);
  const identity=topActivities.length?`${majorText||profile.primary_major||"Your academic direction"} anchored by ${topActivities.slice(0,2).join(" + ")}, with the strongest case coming from demonstrated depth rather than activity count.`:`${majorText||profile.primary_major||"Your academic direction"} is not yet supported by enough executed activity evidence to form a distinctive application identity.`;
  const conf=completeness(profile,score,ai);
  const overall=round(clusters.reduce((sum,c)=>sum+c.score,0)/clusters.length);
  return {version:"1.0",overall,confidence:Number(conf.toFixed(2)),confidence_label:conf>=.8?"High":conf>=.62?"Medium":"Low",application_identity:identity,identity_anchors:identityParts,clusters,strongest_signals:strongest,gaps,ai_strengths:(ai?.strengths||[]).slice(0,5),ai_gaps:(ai?.gaps||[]).slice(0,5),principle:"This graph organizes observable application evidence. It is not an admissions-office rating and should not be read as a universal 100-point score."};
}

export function compareApplicantIntelligence(current,previous){
  if(!current||!previous)return null;
  const currentDims=Object.fromEntries((current.clusters||[]).flatMap(c=>(c.dimensions||[]).map(d=>[d.id,d])));
  const previousDims=Object.fromEntries((previous.clusters||[]).flatMap(c=>(c.dimensions||[]).map(d=>[d.id,d])));
  const deltas=Object.keys(currentDims).filter(k=>previousDims[k]).map(k=>({id:k,label:currentDims[k].label,from:previousDims[k].score,to:currentDims[k].score,delta:currentDims[k].score-previousDims[k].score})).filter(x=>Math.abs(x.delta)>=2).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  return {overall_delta:(current.overall||0)-(previous.overall||0),confidence_delta:Number(((current.confidence||0)-(previous.confidence||0)).toFixed(2)),dimensions:deltas.slice(0,6)};
}
