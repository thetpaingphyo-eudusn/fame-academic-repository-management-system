export const FAME = "FAME";

export const toDisplayText = (text) => {
  if (!text) return text;
  return String(text).replace(/gemini/gi, FAME).replace(/FAME DEV/gi, FAME);
};

export const sourceLabel = (source) => {
  if (source === "gemini-rag" || source === "gemini-rag+general" || source === "gemini" || source === "gemini-vision" || source === "gemini-text" || source === "gemini-refine") {
    return FAME;
  }
  if (source === "error") return `${FAME} error`;
  if (source === "local-db" || source === "local-fallback") return "Local DB";
  return toDisplayText(source);
};
