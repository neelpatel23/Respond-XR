/**
 * API configuration - reads from env or provides fallbacks
 */
const envKey =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GEMINI_API_KEY
    ? process.env.EXPO_PUBLIC_GEMINI_API_KEY
    : "";

export const API_CONFIG = {
  GEMINI_API_KEY: envKey || "",
};

export function isApiKeyConfigured(): boolean {
  return !!API_CONFIG.GEMINI_API_KEY?.trim();
}
