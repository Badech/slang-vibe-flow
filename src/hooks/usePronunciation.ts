// React hook wrapping the Web Speech API for SlangFlow.
//
// Responsibilities (spec §2):
//   - Discover available en-US voices, including the async `voiceschanged`
//     race that affects Chrome / Edge on first page load.
//   - Pick a preferred voice (Google US English → Microsoft Zira → first en-US).
//   - Track speaking state via `onstart` / `onend` so UI can animate.
//   - Toggle between normal (0.85) and slow (0.6) rates.
//
// SSR safety: every browser-only call is guarded behind `isSpeechSupported()`
// and / or runs inside `useEffect`. The hook returns sensible no-op values
// on the server so consumers don't need to gate calls themselves.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_RATE,
  SLOW_RATE,
  isSpeechSupported,
  listEnUsVoices,
  pickPreferredVoice,
  speak as speakRaw,
  stopSpeaking,
} from "@/lib/tts";

export interface UsePronunciationOptions {
  /** Override base rate. Defaults to 0.85 (spec §2). */
  rate?: number;
  /** Slow-mode rate. Defaults to 0.6 (spec §2). */
  slowRate?: number;
  /** Override the language tag (defaults to "en-US"). */
  lang?: string;
}

export interface UsePronunciationResult {
  /** All loaded en-US voices (re-fires after `voiceschanged`). */
  voices: SpeechSynthesisVoice[];
  /** The voice currently selected for playback. */
  voice: SpeechSynthesisVoice | null;
  setVoice: (v: SpeechSynthesisVoice | null) => void;
  /** True while the utterance is mid-flight. */
  isSpeaking: boolean;
  /** True if Web Speech is available in this environment. */
  supported: boolean;
  /** True when slow mode is on. */
  slow: boolean;
  /** Toggle slow mode (rate 0.85 ↔ 0.6). */
  toggleSlow: () => void;
  setSlow: (v: boolean) => void;
  /** Speak the provided text using the current voice + rate. */
  speak: (text: string) => void;
  /** Cancel any currently-speaking utterance. */
  cancel: () => void;
}

export function usePronunciation(opts: UsePronunciationOptions = {}): UsePronunciationResult {
  const baseRate = opts.rate ?? DEFAULT_RATE;
  const slowRate = opts.slowRate ?? SLOW_RATE;

  const supported = useMemo(() => isSpeechSupported(), []);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [slow, setSlow] = useState(false);

  // Keep latest values in refs so the imperative `speak` callback below has
  // stable identity but always reads fresh state.
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const slowRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    slowRef.current = slow;
  }, [slow]);

  // Load voices, then re-load on `voiceschanged` (Chrome/Edge async race).
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const enUs = listEnUsVoices();
      setVoices(enUs);
      setVoice((prev) => prev ?? pickPreferredVoice(enUs) ?? pickPreferredVoice());
    };
    load();
    const synth = window.speechSynthesis;
    synth.addEventListener?.("voiceschanged", load);
    // Some browsers don't fire the event; poll once after a short delay.
    const t = window.setTimeout(load, 500);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      window.clearTimeout(t);
      stopSpeaking();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const u = speakRaw(text, {
        rate: slowRef.current ? slowRate : baseRate,
        voice: voiceRef.current,
        lang: opts.lang ?? "en-US",
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
        },
      });
      utteranceRef.current = u;
    },
    [supported, slowRate, baseRate, opts.lang],
  );

  const toggleSlow = useCallback(() => setSlow((s) => !s), []);

  return {
    voices,
    voice,
    setVoice,
    isSpeaking,
    supported,
    slow,
    toggleSlow,
    setSlow,
    speak,
    cancel,
  };
}
