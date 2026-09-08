import fs from "node:fs/promises";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const root=process.cwd();
const schools=JSON.parse(await fs.readFile(path.join(root,"data/schools.json"),"utf8"));
const brandSource=await fs.readFile(path.join(root,"lib/school-brand.js"),"utf8");
const domainText=brandSource.match(/SCHOOL_DOMAINS=(\{[\s\S]*?\});/)?.[1];
if(!domainText)throw new Error("Could not read official school domain map.");
const domains=Function(`return (${domainText})`)();
const outputDir=path.join(root,"public","school-logos");await fs.mkdir(outputDir,{recursive:true});
const assets={};
const run=promisify(execFile);
const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const candidates=domain=>[domain,domain.startsWith("www.")?domain:`www.${domain}`].flatMap(host=>[`https://${host}/favicon.ico`,`https://${host}/apple-touch-icon.png`,`https://${host}/favicon-32x32.png`]);
async function cacheSchool(school){
  const domain=domains[school.name];if(!domain)return;
  async function attempt(url){
    const temp=path.join(outputDir,`.${slug(school.name)}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    try{
      const {stdout}=await run("curl",["-L","-sS","--max-time","8","-A","UniPath-official-logo-cache/1.0","-o",temp,"-w","%{http_code}|%{content_type}",url],{maxBuffer:1024*1024});
      const [status,type]=String(stdout).trim().split("|");const stat=await fs.stat(temp);
      if(status!=="200"||!type?.startsWith("image/")||stat.size<64){await fs.rm(temp,{force:true});return null}
      const extension=type.includes("svg")?"svg":type.includes("png")?"png":type.includes("webp")?"webp":"ico";return {temp,filename:`${slug(school.name)}.${extension}`};
    }catch{await fs.rm(temp,{force:true}).catch(()=>{});return null}
  }
  const results=await Promise.all(candidates(domain).map(attempt));
  const result=results.find(Boolean);if(!result)return;
  await Promise.all(results.filter(Boolean).filter(x=>x.temp!==result.temp).map(x=>fs.rm(x.temp,{force:true})));
  await fs.rename(result.temp,path.join(outputDir,result.filename));assets[school.name]=result.filename;
}
for(let i=0;i<schools.length;i+=12)await Promise.all(schools.slice(i,i+12).map(cacheSchool));
await fs.writeFile(path.join(root,"data/school-logo-assets.json"),`${JSON.stringify(assets,null,2)}\n`);
console.log(`Cached ${Object.keys(assets).length}/${schools.length} official school marks.`);
