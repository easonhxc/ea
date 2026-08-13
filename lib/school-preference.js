const ALIASES={
  "universityofchicago":"UChicago","uchicago":"UChicago","chicago":"UChicago",
  "universityofpennsylvania":"UPenn","upenn":"UPenn","penn":"UPenn",
  "newyorkuniversity":"NYU","nyu":"NYU",
  "johnshopkinsuniversity":"Johns Hopkins","johnshopkins":"Johns Hopkins","jhu":"Johns Hopkins",
  "carnegiemellonuniversity":"Carnegie Mellon","cmu":"Carnegie Mellon",
  "universityofmichigan":"Michigan","michiganannarborm":"Michigan","umich":"Michigan","umichigan":"Michigan",
  "universityofsoutherncalifornia":"USC","usc":"USC",
  "universityofcaliforniaberkeley":"UC Berkeley","ucberkeley":"UC Berkeley","berkeley":"UC Berkeley",
  "universityofcalifornialosangeles":"UCLA","ucla":"UCLA",
  "georgiainstituteoftechnology":"Georgia Tech","gatech":"Georgia Tech","georgiatech":"Georgia Tech",
  "washingtonuniversityinstlouis":"WashU","washu":"WashU","wustl":"WashU",
  "universityofvirginia":"UVA","uva":"UVA",
  "universityofnorthcarolinachapelhill":"UNC Chapel Hill","unc":"UNC Chapel Hill","uncchapelhill":"UNC Chapel Hill",
  "universityoftexasataustin":"UT Austin","utaustin":"UT Austin","utexas":"UT Austin",
  "universityofillinoisurbanachampaign":"UIUC","uiuc":"UIUC",
  "universityofwisconsinmadison":"Wisconsin–Madison","wisconsinmadison":"Wisconsin–Madison","uwmadison":"Wisconsin–Madison",
  "universityofmarylandcollegepark":"Maryland","umd":"Maryland","maryland":"Maryland",
  "ohiostateuniversity":"Ohio State","osu":"Ohio State",
  "pennsylvaniastateuniversity":"Penn State","pennstate":"Penn State",
  "virginiapolytechnicinstituteandstateuniversity":"Virginia Tech","virginiatech":"Virginia Tech","vtech":"Virginia Tech",
  "imperialcollege":"Imperial College London","imperialcollegelondon":"Imperial College London","imperial":"Imperial College London",
  "universitycollegelondon":"UCL","universitycollegelondon":"UCL","ucl":"UCL",
  "londonschoolofeconomics":"LSE","londonschoolofeconomicsandpoliticalscience":"LSE","lse":"LSE",
  "universityofoxford":"Oxford","oxford":"Oxford",
  "universityofcambridge":"Cambridge","cambridge":"Cambridge",
  "universityofmanchester":"Manchester","manchester":"Manchester",
  "universityofwarwick":"Warwick","warwick":"Warwick",
  "kingscollegelondon":"King’s College London","kcl":"King’s College London"
};

export function normalizeSchoolName(v=""){
  return String(v||"").normalize("NFKC").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");
}
export function canonicalSchoolName(v=""){
  const n=normalizeSchoolName(v);return ALIASES[n]||String(v||"").trim();
}
export function sameSchool(a,b){
  const ca=canonicalSchoolName(a),cb=canonicalSchoolName(b);
  const na=normalizeSchoolName(ca),nb=normalizeSchoolName(cb);
  return !!na&&!!nb&&(na===nb||na.includes(nb)||nb.includes(na));
}
export function preferenceFor(profile,name){
  const row=(profile?.school_preferences||[]).find(x=>sameSchool(x.school_name,name));
  return row?.interest==null?null:Number(row.interest);
}
export function preferredSchoolNames(profile,minInterest=0){
  return (profile?.school_preferences||[]).filter(x=>Number(x.interest)>=minInterest).sort((a,b)=>Number(b.interest)-Number(a.interest)).map(x=>canonicalSchoolName(x.school_name));
}
