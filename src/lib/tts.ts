// Web Speech API helper for native pronunciation.

export interface SpeakOptions {
  rate?: number;
  voice?: SpeechSynthesisVoice | null;
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 1;
  u.pitch = 1;
  if (opts.voice) u.voice = opts.voice;
  else {
    const enUS = listEnglishVoices().find((v) => v.lang === "en-US");
    if (enUS) u.voice = enUS;
  }
  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}