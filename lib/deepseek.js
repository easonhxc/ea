const ENDPOINT = "https://api.deepseek.com/chat/completions";

export function deepseekModelName() {
  return process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

function token() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured.");
  return process.env.DEEPSEEK_API_KEY;
}

export async function deepseekChat(messages, options={}) {
  const response=await fetch(ENDPOINT,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${token()}`,
      "Content-Type":"application/json",
      Accept:"application/json"
    },
    body:JSON.stringify({
      model:options.model || deepseekModelName(),
      messages,
      temperature:options.temperature ?? 0.15,
      max_tokens:options.max_tokens ?? 3200,
      ...(options.json ? {response_format:{type:"json_object"}} : {}),
      ...(options.thinking ? {thinking:{type:"enabled"},reasoning_effort:options.reasoning_effort||"medium"} : {})
    }),
    cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=data?.error?.message || data?.message || `DeepSeek API error ${response.status}`;
    if(response.status===401 || response.status===403) throw new Error(`${message}. Check DEEPSEEK_API_KEY.`);
    if(response.status===402) throw new Error(`${message}. DeepSeek account balance may be insufficient.`);
    if(response.status===429) throw new Error(`${message}. DeepSeek rate limit reached; retry shortly.`);
    throw new Error(message);
  }
  const content=data?.choices?.[0]?.message?.content;
  if(!content) throw new Error("DeepSeek returned an empty response.");
  return content;
}

export function extractJson(text){
  const cleaned=String(text||"").trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  try{return JSON.parse(cleaned)}catch{}
  const a=cleaned.indexOf("{"); const b=cleaned.lastIndexOf("}");
  if(a>=0 && b>a) return JSON.parse(cleaned.slice(a,b+1));
  throw new Error("AI response was not valid JSON.");
}
