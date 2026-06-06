interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechInputSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export interface SpeechListenOptions {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

/** Start listening; returns stop function */
export function listenForSpeech({
  onInterim,
  onFinal,
  onError,
  onEnd,
}: SpeechListenOptions): () => void {
  const Ctor = getSpeechRecognition();
  if (!Ctor) {
    onError?.("Speech recognition not supported in this browser");
    onEnd?.();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalText = "";

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        finalText += chunk;
      } else {
        interim += chunk;
      }
    }
    if (interim) onInterim?.(interim.trim());
    if (finalText.trim()) onFinal(finalText.trim());
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    if (event.error !== "aborted") {
      onError?.(event.error);
    }
  };

  recognition.onend = () => onEnd?.();

  try {
    recognition.start();
  } catch {
    onError?.("Could not start microphone");
    onEnd?.();
  }

  return () => {
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
  };
}

export interface HoldToSpeakSession {
  stop: () => Promise<string>;
  cancel: () => void;
}

/** Keep listening while pointer is held; resolve transcript on release */
export function startHoldToSpeak(options: {
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
}): HoldToSpeakSession | null {
  const Ctor = getSpeechRecognition();
  if (!Ctor) {
    options.onError?.("Speech recognition not supported");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let transcript = "";
  let settled = false;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const chunk = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        transcript += `${chunk} `;
      } else {
        interim += chunk;
      }
    }
    options.onInterim?.(`${transcript}${interim}`.trim());
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    if (event.error !== "aborted" && event.error !== "no-speech") {
      options.onError?.(event.error);
    }
  };

  try {
    recognition.start();
  } catch {
    options.onError?.("Could not start microphone");
    return null;
  }

  return {
    stop: () =>
      new Promise((resolve) => {
        if (settled) {
          resolve(transcript.trim());
          return;
        }
        settled = true;
        recognition.onend = () => resolve(transcript.trim());
        try {
          recognition.stop();
        } catch {
          recognition.abort();
          resolve(transcript.trim());
        }
      }),
    cancel: () => {
      if (settled) return;
      settled = true;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
