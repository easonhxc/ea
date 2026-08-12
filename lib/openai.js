import OpenAI from "openai";

let client;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function modelName() {
  return process.env.OPENAI_MODEL || "gpt-5.6";
}
