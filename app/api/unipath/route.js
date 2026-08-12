import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI, modelName } from "@/lib/openai";
import { ApplicantProfile } from "@/lib/schema";
import { predict } from "@/lib/admissions";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "analyze") {
      const text = String(body.text || "").trim();
      const ageBand = String(body.age_band || "unknown");

      if (ageBand === "under_13") {
        return jsonError(
          "This MVP does not process applicant profile data for users under 13.",
          400
        );
      }
      if (text.length < 20) return jsonError("Please provide a more complete applicant description.");
      if (text.length > 20000) return jsonError("Profile text is too long for this MVP.");

      const client = getOpenAI();
      const response = await client.responses.parse({
        model: modelName(),
        store: false,
        reasoning: { effort: "low" },
        input: [
          {
            role: "developer",
            content:
              "Extract a college applicant profile into the required schema. " +
              "Do not inflate achievements. Use null/unknown when information is missing. " +
              "Do not infer sensitive traits such as race, religion, sexuality, disability, health status, or political affiliation. " +
              "Separate completed achievements from future plans. " +
              "Capture academic preparation, awards, activities, duration, leadership, impact, measurable outcomes, intended majors, countries, and uncertainty notes."
          },
          {
            role: "user",
            content: `Declared age band: ${ageBand}\n\nApplicant description:\n${text}`
          }
        ],
        text: { format: zodTextFormat(ApplicantProfile, "applicant_profile") }
      });

      const profile = response.output_parsed;
      const predictions = predict(
        profile,
        body.primary_major || profile.primary_major,
        body.secondary_major || profile.secondary_major
      );

      return NextResponse.json({ profile, predictions });
    }

    if (action === "predict") {
      const profile = ApplicantProfile.parse(body.profile);
      const predictions = predict(profile, body.primary_major, body.secondary_major);
      return NextResponse.json({ predictions });
    }

    if (action === "counsel") {
      const question = String(body.question || "").trim();
      if (!question) return jsonError("Question is required.");

      const client = getOpenAI();
      const response = await client.responses.create({
        model: modelName(),
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are UniPath AI Counselor. Give concrete, critical college-application strategy. " +
          "Use ONLY the supplied UniPath probability intervals when discussing admissions chances. Never invent a new admissions percentage. " +
          "Explain major fit, school admission mechanism, second-major strategy, ED/EA/RD tradeoffs, and profile weaknesses. " +
          "Do not promise admission. Distinguish completed achievements from plans. " +
          "If a second major looks like a loophole and the profile does not support it, say so. " +
          "Be equally competent for STEM, humanities, social sciences, business, and arts applicants. " +
          "Respond in the user's language.",
        input: [
          {
            role: "developer",
            content:
              "Structured applicant profile:\n" + JSON.stringify(body.profile || {}) +
              "\n\nDeterministic UniPath predictions:\n" + JSON.stringify(body.predictions || {})
          },
          { role: "user", content: question }
        ]
      });

      return NextResponse.json({ answer: response.output_text });
    }

    return jsonError("Unknown action.");
  } catch (error) {
    console.error("unipath api error", error);
    return NextResponse.json(
      { error: error?.message || "UniPath request failed." },
      { status: 500 }
    );
  }
}
