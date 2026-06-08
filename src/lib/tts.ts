// Web Speech API helpers for native pronunciation.
//
// Browser support for `getVoices()` is asynchronous on Chrome / Edge — the
// `voiceschanged` event fires once the voices catalog is populated. Most code
// should use the `usePronunciation` hook in `src/hooks/usePronunciation.ts`
// which handles that race for you; this module is the pure / SSR-safe layer.

import type { Term } from "./types";
import { resolveSpokenEquivalent } from "./types";

// Default rates (per spec §2).
export const DEFAULT_RATE = 0.85;
export const SLOW_RATE = 0.6;
export const DEFAULT_PITCH = 1.0;

export interface SpeakOptions {
  /** Playback rate. Defaults to DEFAULT_RATE (0.85). */
  rate?: number;
  /** Voice override. If unset, falls back to first en-US voice. */
  voice?: SpeechSynthesisVoice | null;
  /** Pitch. Defaults to DEFAULT_PITCH (1.0). */
  pitch?: number;
  /** Language tag. Defaults to "en-US". */
  lang?: string;
  /** Callback fired when utterance starts. */
  onStart?: () => void;
  /** Callback fired when utterance ends (or errors). */
  onEnd?: () => void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listAllVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  return listAllVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export function listEnUsVoices(): SpeechSynthesisVoice[] {
  return listAllVoices().filter((v) => v.lang.toLowerCase() === "en-us");
}

/**
 * Pick the best en-US voice using the priority chain from spec §2:
 *   "Google US English" > "Microsoft Zira" > first en-US > first en-* > null
 */
export function pickPreferredVoice(
  voices: SpeechSynthesisVoice[] = listAllVoices(),
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const byName = (needle: string) =>
    voices.find((v) => v.name.toLowerCase().includes(needle.toLowerCase()));

  const google = byName("Google US English");
  if (google) return google;

  const zira = byName("Microsoft Zira");
  if (zira) return zira;

  const enUs = voices.find((v) => v.lang.toLowerCase() === "en-us");
  if (enUs) return enUs;

  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return anyEn ?? null;
}

/**
 * Speak a single utterance, cancelling whatever's currently queued. Returns
 * the utterance handle so callers can attach extra event listeners if needed
 * (the `onStart` / `onEnd` options usually suffice).
 */
export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (!isSpeechSupported()) return null;
  if (!text.trim()) return null;

  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? DEFAULT_RATE;
  u.pitch = opts.pitch ?? DEFAULT_PITCH;
  u.lang = opts.lang ?? "en-US";
  u.voice = opts.voice ?? pickPreferredVoice();

  if (opts.onStart) u.onstart = opts.onStart;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }

  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/**
 * Resolve the text that should actually be SPOKEN for a term. For idioms the
 * spoken form is the term itself; for abbreviations/text slang it's the
 * full expansion ("NGL" → "Not gonna lie"). Per spec §2.
 */
export function speakableText(term: Term): string {
  return resolveSpokenEquivalent(term);
}
