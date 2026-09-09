"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  { x: 9, y: 65, en: "Your story", zh: "个人背景", detail: "课程、兴趣与真实经历", sub: "Courses, interests and experience" },
  { x: 36, y: 33, en: "Build evidence", zh: "积累证据", detail: "让项目与成果证明你的投入", sub: "Projects and outcomes that show commitment" },
  { x: 64, y: 60, en: "Find your fit", zh: "发现匹配", detail: "连接你的方向与大学机会", sub: "Connect your direction with college opportunities" },
  { x: 91, y: 24, en: "Apply", zh: "走向申请", detail: "把选校、文书与时间线串成计划", sub: "Bring colleges, writing and deadlines together" },
];

export default function ApplicationJourney({ enabled, language, variant }) {
  const [desktop, setDesktop] = useState(false);
  const [active, setActive] = useState(null);
  const root = useRef(null);
  useEffect(() => {
    const media = matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (!desktop || !enabled) return null;
  const zh = language === "zh";
  const move = event => {
    const box = event.currentTarget.getBoundingClientRect();
    root.current.style.setProperty("--journey-x", `${event.clientX - box.left}px`);
    root.current.style.setProperty("--journey-y", `${event.clientY - box.top}px`);
  };
  return <section ref={root} className={`applicationJourney ${variant}`} aria-label={zh ? "申请之路" : "Your application journey"} onPointerMove={move}>
    <div className="journeyHeading"><span>{zh ? "你的下一程" : "YOUR NEXT CHAPTER"}</span><b>{zh ? "每一步，都走向更适合你的未来。" : "A path shaped by you."}</b><span className="journeyHint">{zh ? "探索路径上的节点 ↗" : "Explore the milestones ↗"}</span></div>
    <div className="journeyMap">
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><path className="journeyTrack" d="M90 130 C200 130 220 66 360 66 S500 120 640 120 S800 48 910 48"/><path className="journeyFlow" d="M90 130 C200 130 220 66 360 66 S500 120 640 120 S800 48 910 48"/></svg>
      {steps.map((step, i) => <button key={step.en} type="button" className={`journeyNode ${active === i ? "selected" : ""}`} style={{ left: `${step.x}%`, top: `${step.y}%`, "--step": i }} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} aria-expanded={active === i} aria-describedby={active === i ? `journey-${variant}-detail` : undefined}><span className="journeyDot">{String(i + 1).padStart(2, "0")}</span><b>{zh ? step.zh : step.en}</b></button>)}
    </div>
    <div className="journeyDetail" id={`journey-${variant}-detail`} aria-live="polite">{active === null ? (zh ? "背景 → 证据 → 匹配 → 申请" : "Story → Evidence → Fit → Application") : (zh ? steps[active].detail : steps[active].sub)}</div>
  </section>;
}
