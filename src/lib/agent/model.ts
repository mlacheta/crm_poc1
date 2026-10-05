// Elige el modelo de LUCIA según LLM_PROVIDER (mock | google | anthropic | openai) y LLM_MODEL.
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { createMockModel } from "./mock-model";

export type LlmProvider = "mock" | "google" | "anthropic" | "openai";

const DEFAULT_MODELS: Partial<Record<LlmProvider, string>> = {
  google: "gemini-3.8-flash",
  anthropic: "claude-haiku-4-5",
};

const API_KEY_ENV: Record<Exclude<LlmProvider, "mock">, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function llmConfig(): { provider: LlmProvider; model: string } {
  const provider = (process.env.LLM_PROVIDER ?? "mock") as LlmProvider;
  if (!["mock", "google", "anthropic", "openai"].includes(provider)) {
    throw new Error(`LLM_PROVIDER inválido: "${provider}". Usá mock, google, anthropic u openai.`);
  }
  const model = provider === "mock" ? "reglas-v1" : (process.env.LLM_MODEL || DEFAULT_MODELS[provider]);
  if (!model) throw new Error(`Definí LLM_MODEL para el proveedor ${provider}.`);
  return { provider, model };
}

export function getLanguageModel(): LanguageModelV4 {
  const { provider, model } = llmConfig();
  if (provider === "mock") return createMockModel();
  if (!process.env[API_KEY_ENV[provider]]) {
    throw new Error(`Falta ${API_KEY_ENV[provider]} en .env para usar LLM_PROVIDER=${provider}.`);
  }
  switch (provider) {
    case "google":
      return google(model);
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
  }
}
