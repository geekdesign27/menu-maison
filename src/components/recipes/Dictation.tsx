import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { Button, Card } from "../ui";

const MAX_SECONDS = 5 * 60;
// Safari records AAC in mp4, Chrome and Firefox Opus in webm
const TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

function micError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Le micro est refusé. Sur l'iPhone : Réglages, Safari, Micro, puis « Autoriser ».";
  if (name === "NotFoundError") return "Aucun micro trouvé sur cet appareil.";
  return "Le micro ne démarre pas. Ferme l'app et réessaie.";
}

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Big microphone button: records until « Terminer » (5 minutes at most) and
 * hands over the recording. Nothing leaves the phone before that.
 */
export function Dictation({
  onRecorded,
  onError,
}: {
  onRecorded: (audio: Blob) => void;
  onError: (message: string) => void;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const cancelled = useRef(false);
  const starting = useRef(false);
  const mounted = useRef(true);

  // Leaving the page while recording cancels: nothing is sent, the microphone is released
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (seconds === null) return;
    if (seconds >= MAX_SECONDS) {
      recorder.current?.stop();
      return;
    }
    const timer = setTimeout(
      () => setSeconds((s) => (s === null ? s : s + 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [seconds]);

  const start = async () => {
    // A second tap while the permission prompt is open must not open a second stream
    if (starting.current || recorder.current?.state === "recording") return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError(
        "Ce navigateur ne permet pas d'enregistrer. Colle plutôt le texte de la recette.",
      );
      return;
    }
    starting.current = true;
    let stream: MediaStream | null = null;
    const release = () => stream?.getTracks().forEach((t) => t.stop());
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        release();
        return;
      }
      const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        release();
        if (!mounted.current) return;
        setSeconds(null);
        if (cancelled.current || chunks.length === 0) return;
        onRecorded(
          new Blob(chunks, {
            type: (rec.mimeType || mimeType || "audio/mp4").split(";")[0],
          }),
        );
      };
      cancelled.current = false;
      rec.start(1000);
      recorder.current = rec;
      setSeconds(0);
    } catch (e) {
      release();
      onError(micError(e));
    } finally {
      starting.current = false;
    }
  };

  const finish = (cancel: boolean) => {
    cancelled.current = cancel;
    recorder.current?.stop();
  };

  if (seconds === null) {
    return (
      <button type="button" onClick={start} className="block w-full text-left">
        <Card className="flex items-center gap-4 p-4 active:bg-carrot-soft">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-carrot text-white shadow-md">
            <Mic size={30} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">Dicter la recette</div>
            <div className="text-[15px] text-muted">
              Raconte ce que tu fais, avec les quantités. 5 minutes au plus.
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Ta voix est transcrite par Groq (États-Unis), puis effacée.
            </div>
          </div>
        </Card>
      </button>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-6 text-center">
      <span
        className="relative flex size-24 items-center justify-center"
        aria-hidden
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-berry/30" />
        <span className="relative flex size-20 items-center justify-center rounded-full bg-berry text-white">
          <Mic size={36} />
        </span>
      </span>
      <div>
        <div className="text-lg font-black">Je t'écoute…</div>
        <div className="text-[15px] text-muted tabular-nums" aria-live="off">
          {clock(seconds)} sur {clock(MAX_SECONDS)}
        </div>
      </div>
      <p className="text-[15px] text-muted">
        Par exemple : « Pour 4 personnes, je prends 2 oignons, 500 g de bœuf
        haché… ». Dis aussi les étapes.
      </p>
      <div className="grid w-full grid-cols-[auto_1fr] gap-3">
        <Button variant="secondary" onClick={() => finish(true)}>
          <X size={20} />
          Annuler
        </Button>
        <Button onClick={() => finish(false)}>
          <Square size={18} fill="currentColor" />
          Terminer
        </Button>
      </div>
    </Card>
  );
}
