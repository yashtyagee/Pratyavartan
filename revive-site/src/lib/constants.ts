export const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "/console";

export const API_DOCS_URL =
  process.env.NEXT_PUBLIC_API_DOCS_URL ??
  (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
    ? "https://pratyavartan.onrender.com/docs"
    : "http://localhost:8010/docs");

export const API_BASE_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://pratyavartan.onrender.com";
    }
  }
  return process.env.NODE_ENV === "production"
    ? "https://pratyavartan.onrender.com"
    : "http://localhost:8010";
})();

