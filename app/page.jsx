"use client";

import { useMemo, useState } from "react";

const demo = `International student applying to the US and UK. GPA is about 4.6 weighted with all A grades. SAT 1550, TOEFL 116, AP Physics 1 5, AP Calculus BC 5, AP Chemistry 5, AP English Language 5. I have spent about two years on materials and environmental engineering research, including a biomimetic geotextile project and an adsorption-material project. I lead a school STEM club, have regional science competition recognition, and have community service experience. My first-choice field is Materials Science and Engineering and my second direction is Environmental Engineering.`;

function pct(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

export default function Home() {
  const [text, setText] = useState(demo);
  const [ageBand, setAgeBand] = useState("13_17");
  const [profile, setProfile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [primaryMajor, setPrimaryMajor] = useState("Materials Science and Engineering");
  const [secondaryMajor, setSecondaryMajor] = useState("Environmental Engineering");
  const [question, setQuestion] = useState("根据我的情况，我应该如何选择 ED 学校？");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState("");

  async function call(action, body = {}) {
    const res = await fetch("/api/unipath", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function analyze() {
    try {
      setLoading("analyze");
      setAnswer("");
      const data = await call("analyze", {
        text,
        age_band: ageBand,
        primary_major: primaryMajor,
        secondary_major: secondaryMajor || null,
      });
      setProfile(data.profile);
      const major1 = data.profile.primary_major || primaryMajor;
      const major2 = data.profile.secondary_major || secondaryMajor;
      setPrimaryMajor(major1);
      setSecondaryMajor(major2 || "");
      setPredictions(data.predictions);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading("");
    }
  }

  async function rerunPrediction() {
    if (!profile) return;
    try {
      setLoading("predict");
      const data = await call("predict", {
        profile,
        primary_major: primaryMajor,
        secondary_major: secondaryMajor || null,
      });
      setPredictions(data.predictions);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading("");
    }
  }

  async function askAI() {
    if (!profile || !predictions) {
      alert("请先运行 AI Profile Analysis。");
      return;
    }
    try {
      setLoading("chat");
      const data = await call("counsel", {
        question,
        profile,
        predictions,
      });
      setAnswer(data.answer);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading("");
    }
  }

  const score = predictions?.profile_scores;
  const schools = predictions?.schools || [];

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <div className="eyebrow">UNIPATH AI · REAL API MVP</div>
          <h1>AI-assisted college strategy, with a deterministic admissions engine underneath.</h1>
          <p>
            AI understands the applicant. UniPath calculates the numbers. AI explains the strategy.
          </p>
        </div>
        <div className="apiBadge">Server-side OpenAI API</div>
      </header>

      <section className="grid two">
        <div className="card">
          <div className="cardHead">
            <h2>1. AI Profile Import</h2>
            <span>one-click AI analysis</span>
          </div>
          <label>Age band</label>
          <select value={ageBand} onChange={e => setAgeBand(e.target.value)}>
            <option value="13_17">13–17</option>
            <option value="18_plus">18+</option>
            <option value="under_13">Under 13 — blocked in MVP</option>
          </select>
          <label>Paste your profile / activities / resume summary</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={13} />
          <button className="primary" onClick={analyze} disabled={!!loading}>
            {loading === "analyze" ? "Analyzing…" : "Analyze with AI"}
          </button>
          <div className="fineprint">
            普通用户不需要 API Key。网站拥有者只在服务器上配置一次 OpenAI API Key。
          </div>
        </div>

        <div className="card">
          <div className="cardHead"><h2>Structured Profile</h2><span>Structured Outputs</span></div>
          {!profile ? (
            <div className="empty">AI analysis will appear here.</div>
          ) : (
            <>
              <div className="chips">
                <span>{profile.applicant_type}</span>
                <span>{profile.curriculum}</span>
                <span>{profile.grade_band}</span>
                <span>SAT {profile.sat ?? "—"}</span>
                <span>AP 5s {profile.ap_5_count ?? "—"}</span>
              </div>
              <p className="summary">{profile.profile_summary}</p>
              <div className="miniGrid">
                <div><b>{profile.awards.length}</b><small>Awards</small></div>
                <div><b>{profile.activities.length}</b><small>Activities</small></div>
                <div><b>{profile.distinctive_outputs.length}</b><small>Outputs</small></div>
                <div><b>{profile.uncertainties.length}</b><small>Missing / uncertain</small></div>
              </div>
              {profile.uncertainties.length > 0 && (
                <div className="uncertainty">
                  <b>AI wants confirmation:</b>
                  <ul>{profile.uncertainties.slice(0,5).map((x,i)=><li key={i}>{x}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="card section">
        <div className="cardHead">
          <h2>2. Deterministic Prediction Engine</h2>
          <span>AI does not invent these probabilities</span>
        </div>
        <div className="majorRow">
          <div>
            <label>Primary direction</label>
            <input value={primaryMajor} onChange={e => setPrimaryMajor(e.target.value)} />
          </div>
          <div>
            <label>Secondary direction</label>
            <input value={secondaryMajor} onChange={e => setSecondaryMajor(e.target.value)} />
          </div>
          <button className="secondary" onClick={rerunPrediction} disabled={!profile || !!loading}>
            {loading === "predict" ? "Recalculating…" : "Recalculate"}
          </button>
        </div>

        {score && (
          <div className="scoreGrid">
            <Score label="Overall" value={score.overall}/>
            <Score label="Academic" value={score.academic}/>
            <Score label="Activities" value={score.activities}/>
            <Score label="Output" value={score.output}/>
            <Score label="Awards" value={score.awards}/>
            <Score label="Narrative" value={score.narrative}/>
          </div>
        )}

        <div className="schoolList">
          {schools.length === 0 ? <div className="empty">Run AI analysis to generate schools.</div> :
            schools.map((s,i) => (
              <div className="school" key={s.school}>
                <div className="rank">{i+1}</div>
                <div className="schoolMain">
                  <b>{s.school}</b>
                  <span>{s.program}</span>
                  {s.second_major_reason && <small>{s.second_major_reason}</small>}
                </div>
                <div><span className={`tier ${s.tier.toLowerCase().replace(" ","")}`}>{s.tier}</span></div>
                <div className="chance">{pct(s.interval[0])}–{pct(s.interval[1])}<small>center {pct(s.probability)}</small></div>
              </div>
            ))
          }
        </div>
      </section>

      <section className="grid two section">
        <div className="card">
          <div className="cardHead"><h2>3. AI Counselor</h2><span>one-click AI analysis</span></div>
          <label>Ask about ED / majors / school list / weaknesses</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={5}/>
          <button className="primary" onClick={askAI} disabled={!profile || !!loading}>
            {loading === "chat" ? "Thinking…" : "Ask UniPath AI"}
          </button>
        </div>
        <div className="card counsel">
          <div className="cardHead"><h2>AI Answer</h2><span>grounded in UniPath output</span></div>
          {answer ? <div className="answer">{answer}</div> : <div className="empty">The counselor answer will appear here.</div>}
        </div>
      </section>

      <footer>
        Planning tool only. Not an admissions office model or guarantee. Verify current policies, deadlines, programs and aid rules with each university.
      </footer>
    </main>
  );
}

function Score({label,value}) {
  const n = Math.round(value || 0);
  return <div className="score"><span>{label}</span><b>{n}</b><div><i style={{width:`${n}%`}} /></div></div>
}
