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

export function isOpenAIHoldToSpeakSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof window.MediaRecorder !== "undefined"
  );
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
  stopAudio?: () => Promise<RecordedSpeech | null>;
  cancel: () => void;
}

export interface RecordedSpeech {
  audio: Blob;
  filename: string;
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

  let finalText = "";
  let interimText = "";
  let settled = false;
  let stopping = false;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        finalText += `${chunk} `;
      } else {
        interim += chunk;
      }
    }
    interimText = interim.trim();
    options.onInterim?.(`${finalText}${interimText}`.trim());
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    if (event.error !== "aborted" && event.error !== "no-speech") {
      options.onError?.(event.error);
    }
  };

  recognition.onend = () => {
    if (settled || stopping) return;
    try {
      recognition.start();
    } catch {
      /* The user can release and resolve the latest heard text. */
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
        const heardText = () => (finalText.trim() || interimText.trim()).trim();
        if (settled) {
          resolve(heardText());
          return;
        }
        settled = true;
        stopping = true;
        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          resolve(heardText());
        };
        recognition.onend = finish;
        window.setTimeout(finish, 500);
        try {
          recognition.stop();
        } catch {
          recognition.abort();
          finish();
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

function preferredAudioMimeType(): string {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function transcribeAudio(audio: Blob): Promise<string> {
  const form = new FormData();
  const extension = audio.type.includes("mp4") ? "mp4" : "webm";
  form.append("audio", audio, `question.${extension}`);

  const res = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not transcribe audio");
  }
  return data.text?.trim() ?? "";
}

function recordedSpeechFromChunks(
  chunks: BlobPart[],
  mimeType: string
): RecordedSpeech | null {
  if (!chunks.length) return null;
  const audio = new Blob(chunks, { type: mimeType || "audio/webm" });
  const extension = audio.type.includes("mp4") ? "mp4" : "webm";
  return { audio, filename: `question.${extension}` };
}

/** Record while pointer is held; transcribe the audio with OpenAI on release. */
export async function startOpenAIHoldToSpeak(options: {
  onError?: (message: string) => void;
}): Promise<HoldToSpeakSession | null> {
  if (!isOpenAIHoldToSpeakSupported()) {
    options.onError?.("Speech recording not supported");
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredAudioMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    const chunks: BlobPart[] = [];
    let settled = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start();

    const stopTracks = () => {
      stream.getTracks().forEach((track) => track.stop());
    };

    return {
      stop: () =>
        new Promise((resolve) => {
          if (settled) {
            resolve("");
            return;
          }
          settled = true;
          recorder.onstop = () => {
            stopTracks();
            if (!chunks.length) {
              resolve("");
              return;
            }
            const recorded = recordedSpeechFromChunks(
              chunks,
              recorder.mimeType || "audio/webm"
            );
            if (!recorded) {
              resolve("");
              return;
            }
            void transcribeAudio(recorded.audio)
              .then(resolve)
              .catch((error) => {
                options.onError?.(
                  error instanceof Error ? error.message : "Could not transcribe audio"
                );
                resolve("");
              });
          };
          try {
            recorder.stop();
          } catch {
            stopTracks();
            resolve("");
          }
        }),
      stopAudio: () =>
        new Promise((resolve) => {
          if (settled) {
            resolve(null);
            return;
          }
          settled = true;
          recorder.onstop = () => {
            stopTracks();
            resolve(
              recordedSpeechFromChunks(chunks, recorder.mimeType || "audio/webm")
            );
          };
          try {
            recorder.stop();
          } catch {
            stopTracks();
            resolve(null);
          }
        }),
      cancel: () => {
        if (settled) return;
        settled = true;
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          /* ignore */
        }
        stopTracks();
      },
    };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "NotAllowedError"
        ? "not-allowed"
        : "Could not start microphone";
    options.onError?.(message);
    return null;
  }
}
