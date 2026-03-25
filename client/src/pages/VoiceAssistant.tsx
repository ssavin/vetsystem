import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import {
  Mic, MicOff, Camera, CameraOff, Bot, User, Volume2,
  Loader2, AlertCircle, UserCheck, UserPlus, Trash2, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Local models (copied to dist/public/models/ by vite build)
// CDN fallback if local not found (vladmandic/face-api mirrors original weights)
const MODEL_URL_LOCAL = "/models";
const MODEL_URL_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";
const RECOGNITION_THRESHOLD = 0.5;

async function loadModelWithFallback(
  loader: (url: string) => Promise<void>,
  name: string
): Promise<void> {
  try {
    await loader(MODEL_URL_LOCAL);
  } catch (e1) {
    console.warn(`[face-api] Local model "${name}" failed, trying CDN...`, e1);
    try {
      await loader(MODEL_URL_CDN);
    } catch (e2) {
      console.error(`[face-api] CDN model "${name}" also failed`, e2);
      throw e2;
    }
  }
}

type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RecognizedOwner {
  ownerId: string;
  ownerName: string;
  distance: number;
}

interface EnrolledFace {
  id: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

interface OwnerSearchResult {
  id: string;
  name: string;
  phone?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoiceAssistant() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const faceDetectedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const recognizedOwnerRef = useRef<RecognizedOwner | null>(null);
  const recognitionReadyRef = useRef(false); // avoids stale closure in interval
  const stoppedRef = useRef(false);          // set on stop — blocks async AI/TTS callbacks
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Floating avatar drag state ───────────────────────────────────────────────
  const avatarFloatRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef  = useRef({ x: 0, y: 0 });
  const isDraggingRef2 = useRef(false);
  const avatarPosRef   = useRef({ x: typeof window !== "undefined" ? window.innerWidth - 180 : 1100, y: 80 });

  const [mouthOpen, setMouthOpen] = useState(0);
  const [status, setStatus] = useState<Status>("init");
  const [modelsLoaded, setModelsLoaded] = useState(false);        // full: detector + landmarks + recognition
  const [detectorReady, setDetectorReady] = useState(false);      // minimal: just face detector (189KB)
  const [recognitionReady, setRecognitionReady] = useState(false); // all 3 models done
  const [modelLoadStep, setModelLoadStep] = useState(0);           // 0=init 1=detector 2=landmarks 3=recognition
  const [cameraActive, setCameraActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recognizedOwner, setRecognizedOwner] = useState<RecognizedOwner | null>(null);
  const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFace[]>([]);

  // Enrollment dialog state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollOwners, setEnrollOwners] = useState<OwnerSearchResult[]>([]);
  const [enrollSelected, setEnrollSelected] = useState<OwnerSearchResult | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<"idle" | "capturing" | "saving" | "done">("idle");

  const { toast } = useToast();

  // ─── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Load models progressively with CDN fallback ─────────────────────────────
  // Step 1: TinyFaceDetector (189KB) → unlock camera button immediately
  // Step 2+3: Landmark + Recognition models (6.5MB) in background
  const loadModels = useCallback(async () => {
    try {
      // Step 1: tiny detector — fast, unlocks the camera button
      setModelLoadStep(1);
      await loadModelWithFallback(
        url => faceapi.nets.tinyFaceDetector.loadFromUri(url),
        "tinyFaceDetector"
      );
      setDetectorReady(true);
      setModelsLoaded(true); // camera button unlocks here
      setStatus("ready");

      // Step 2: landmarks (349KB)
      setModelLoadStep(2);
      await loadModelWithFallback(
        url => faceapi.nets.faceLandmark68Net.loadFromUri(url),
        "faceLandmark68"
      );

      // Step 3: recognition model (6.2MB) — heaviest, loads last
      setModelLoadStep(3);
      await loadModelWithFallback(
        url => faceapi.nets.faceRecognitionNet.loadFromUri(url),
        "faceRecognition"
      );
      recognitionReadyRef.current = true;
      setRecognitionReady(true);
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      if (!detectorReady) {
        setErrorMessage("Не удалось загрузить модели. Проверьте интернет-соединение и перезагрузите страницу.");
      }
    }
  }, [detectorReady]);

  // ─── Load face descriptors and build matcher ──────────────────────────────────
  const loadDescriptors = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/face-recognition/descriptors");
      const data: EnrolledFace[] = await res.json();
      setEnrolledFaces(data);

      if (data.length === 0) {
        faceMatcherRef.current = null;
        return;
      }

      const labeled = data.map((item: any) => {
        // JSONB can come back as array, string, or object — handle all cases
        let raw = item.descriptor;
        if (typeof raw === "string") {
          try { raw = JSON.parse(raw); } catch { raw = []; }
        }
        const nums: number[] = Array.isArray(raw)
          ? raw
          : Object.values(raw as Record<string, number>);
        const arr = new Float32Array(nums);
        return new faceapi.LabeledFaceDescriptors(
          `${item.ownerName}__${item.ownerId}`,
          [arr]
        );
      });
      faceMatcherRef.current = new faceapi.FaceMatcher(labeled, RECOGNITION_THRESHOLD);
    } catch (err: any) {
      console.error("Failed to load face descriptors:", err);
      toast({ title: "Ошибка загрузки лиц", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    loadModels().then(() => loadDescriptors());
    return () => stopEverything();
  }, []);

  // ─── Floating avatar drag handlers ───────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef2.current || !avatarFloatRef.current) return;
      const x = Math.max(0, Math.min(window.innerWidth - 160, e.clientX - dragOffsetRef.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 210, e.clientY - dragOffsetRef.current.y));
      avatarPosRef.current = { x, y };
      avatarFloatRef.current.style.left = `${x}px`;
      avatarFloatRef.current.style.top = `${y}px`;
    };
    const onUp = () => { isDraggingRef2.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onAvatarMouseDown = (e: React.MouseEvent) => {
    isDraggingRef2.current = true;
    dragOffsetRef.current = { x: e.clientX - avatarPosRef.current.x, y: e.clientY - avatarPosRef.current.y };
    e.preventDefault();
  };

  // ─── Stop everything ─────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    stoppedRef.current = true; // block any pending async AI/TTS callbacks
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = null;
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    recognitionRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    // Stop OpenAI TTS audio
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    setMouthOpen(0);
    window.speechSynthesis.cancel();
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    faceDetectedRef.current = false;
  }, []);

  // ─── TTS via OpenAI (with browser fallback) ──────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (stoppedRef.current) return;

    // Cancel previous audio
    window.speechSynthesis.cancel();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    setMouthOpen(0);

    isSpeakingRef.current = true;
    setStatus("speaking");

    const onEnd = () => {
      isSpeakingRef.current = false;
      setMouthOpen(0);
      if (stoppedRef.current) return;
      setStatus(faceDetectedRef.current ? "face" : "ready");
      if (faceDetectedRef.current && !isListeningRef.current) startListening();
    };

    try {
      const res = await apiRequest("POST", "/api/voice-assistant/tts", { text, voice: "nova" });
      if (stoppedRef.current) return;

      const arrayBuffer = await res.arrayBuffer();
      if (stoppedRef.current) return;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      if (stoppedRef.current) { audioCtx.close(); return; }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        // Voice frequencies: bins 2–15 correspond to ~170–1300 Hz
        const slice = Array.from(dataArray.slice(2, 16));
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        setMouthOpen(Math.min(1, avg / 72));
        animFrameRef.current = requestAnimationFrame(tick);
      };

      source.onended = () => {
        cancelAnimationFrame(animFrameRef.current);
        audioCtx.close();
        audioCtxRef.current = null;
        onEnd();
      };

      tick();
      source.start(0);
    } catch (err) {
      console.warn("[TTS] OpenAI failed, using browser fallback:", err);
      setMouthOpen(0);
      // Browser TTS fallback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ru-RU";
      utterance.rate = 1.05;
      const ru = window.speechSynthesis.getVoices().find(v => v.lang.startsWith("ru"));
      if (ru) utterance.voice = ru;
      utterance.onend = utterance.onerror = onEnd;
      window.speechSynthesis.speak(utterance);
    }
  }, []); // intentionally empty deps — uses refs only

  // ─── Send to AI ──────────────────────────────────────────────────────────────
  const sendToAI = useCallback(async (text: string, autoContext?: string) => {
    setStatus("processing");
    setCurrentTranscript("");

    const fullText = autoContext ? `${autoContext}\n\nПользователь сказал: ${text}` : text;
    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await apiRequest("POST", "/api/voice-assistant/chat", { text: fullText, history });
      if (stoppedRef.current) return; // camera was turned off while waiting for AI
      const result = await res.json();
      if (stoppedRef.current) return;
      const response: string = result.response || "Не могу ответить.";
      const actions: { type: string; data: any }[] = result.actions || [];

      const newMsgs: Message[] = [{ role: "assistant", content: response, timestamp: new Date() }];
      for (const a of actions) {
        if (a.type === "appointment_booked" && a.data?.summary) {
          newMsgs.push({ role: "assistant", content: `✓ Запись: ${a.data.summary}`, timestamp: new Date() });
        }
        if (a.type === "payment_processed" && a.data?.summary) {
          newMsgs.push({ role: "assistant", content: `💳 Оплата: ${a.data.summary}`, timestamp: new Date() });
        }
      }
      setMessages(prev => [...prev, ...newMsgs]);
      speak(response);
    } catch {
      if (stoppedRef.current) return;
      const errMsg = "Произошла ошибка. Попробуйте снова.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg, timestamp: new Date() }]);
      speak(errMsg);
    }
  }, [messages, speak]);

  // ─── Speech recognition ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (isListeningRef.current || isSpeakingRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErrorMessage("Web Speech API поддерживается только в Chrome"); return; }

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => { isListeningRef.current = true; setStatus("listening"); };
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      if (r.isFinal) {
        setCurrentTranscript("");
        const t = r[0].transcript.trim();
        if (t.length > 1) sendToAI(t);
        else if (faceDetectedRef.current) { setStatus("face"); setTimeout(() => startListening(), 300); }
      } else {
        setCurrentTranscript(r[0].transcript);
      }
    };
    rec.onerror = (e) => {
      isListeningRef.current = false;
      recognitionRef.current = null;
      if (e.error === "no-speech" && faceDetectedRef.current && !isSpeakingRef.current) {
        setStatus("face");
        setTimeout(() => startListening(), 300);
      }
    };
    rec.onend = () => { isListeningRef.current = false; recognitionRef.current = null; };

    recognitionRef.current = rec;
    try { rec.start(); } catch { isListeningRef.current = false; }
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    recognitionRef.current = null;
    isListeningRef.current = false;
  }, []);

  // ─── Detection + Recognition loop ────────────────────────────────────────────
  const startDetectionLoop = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        let hasFace = false;
        let detectionBoxes: faceapi.FaceDetection[] = [];

        if (recognitionReadyRef.current) {
          // Full pipeline: detect + landmarks + descriptor (for recognition)
          const full = await faceapi
            .detectAllFaces(video, options)
            .withFaceLandmarks()
            .withFaceDescriptors();
          hasFace = full.length > 0;
          detectionBoxes = full.map(d => d.detection);

          if (hasFace) {
            // Recognition attempt
            if (faceMatcherRef.current && full[0]) {
              const match = faceMatcherRef.current.findBestMatch(full[0].descriptor);
              if (match.label !== "unknown") {
                const [ownerName, ownerId] = match.label.split("__");
                const prev = recognizedOwnerRef.current;
                if (!prev || prev.ownerId !== ownerId) {
                  const recognized: RecognizedOwner = { ownerId, ownerName, distance: match.distance };
                  recognizedOwnerRef.current = recognized;
                  setRecognizedOwner(recognized);
                  if (!isSpeakingRef.current) {
                    speak(`Здравствуйте, ${ownerName}!`);
                    setMessages(prev => [...prev, {
                      role: "assistant",
                      content: `Система: клиент ${ownerName} подошёл к стойке`,
                      timestamp: new Date(),
                    }]);
                  }
                }
              } else {
                if (recognizedOwnerRef.current) { recognizedOwnerRef.current = null; setRecognizedOwner(null); }
              }
            }
          }
        } else {
          // Minimal pipeline: detection only (while recognition model still loading)
          const basic = await faceapi.detectAllFaces(video, options);
          hasFace = basic.length > 0;
          detectionBoxes = basic;
        }

        if (hasFace) {
          const scaleX = canvas.width / (video.videoWidth || 640);
          const scaleY = canvas.height / (video.videoHeight || 480);

          detectionBoxes.forEach(det => {
            const { x, y, width, height } = det.box;
            const isKnown = recognizedOwnerRef.current !== null;
            ctx.strokeStyle = isKnown ? "#22c55e" : "#3b82f6";
            ctx.lineWidth = 2;
            ctx.shadowColor = isKnown ? "#22c55e" : "#3b82f6";
            ctx.shadowBlur = 10;
            ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

            if (isKnown && recognizedOwnerRef.current) {
              ctx.shadowBlur = 0;
              ctx.fillStyle = "rgba(34,197,94,0.85)";
              const label = recognizedOwnerRef.current.ownerName;
              ctx.font = "bold 14px sans-serif";
              const tw = ctx.measureText(label).width;
              ctx.fillRect(x * scaleX, y * scaleY - 24, tw + 16, 22);
              ctx.fillStyle = "#fff";
              ctx.fillText(label, x * scaleX + 8, y * scaleY - 7);
            }
          });
        }

        if (hasFace && !faceDetectedRef.current) {
          faceDetectedRef.current = true;
          if (!isSpeakingRef.current && !isListeningRef.current) {
            setStatus("face");
            setTimeout(() => startListening(), 500);
          }
        } else if (!hasFace && faceDetectedRef.current) {
          faceDetectedRef.current = false;
          recognizedOwnerRef.current = null;
          setRecognizedOwner(null);
          stopListening();
          if (!isSpeakingRef.current) setStatus("ready");
        }
      } catch {}
    }, 250);
  }, [startListening, stopListening, speak]);

  // ─── Camera ───────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!modelsLoaded) { toast({ title: "Подождите", description: "Загрузка моделей..." }); return; }
    stoppedRef.current = false; // reset stop flag — agent is active again
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraActive(true);
      setStatus("ready");
      setErrorMessage("");
      startDetectionLoop();
    } catch {
      setErrorMessage("Нет доступа к камере. Разрешите использование в браузере.");
    }
  }, [modelsLoaded, startDetectionLoop]);

  const stopCamera = useCallback(() => {
    stopEverything();
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCameraActive(false);
    setStatus("init");
    setCurrentTranscript("");
    setRecognizedOwner(null);
  }, [stopEverything]);

  // ─── Enrollment ───────────────────────────────────────────────────────────────
  const searchOwners = useCallback(async (q: string) => {
    if (q.length < 2) { setEnrollOwners([]); return; }
    try {
      const res = await apiRequest("GET", `/api/owners?search=${encodeURIComponent(q)}&limit=8&page=1`);
      const data = await res.json();
      setEnrollOwners((data.data || []).slice(0, 8));
    } catch { setEnrollOwners([]); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchOwners(enrollSearch), 350);
    return () => clearTimeout(timer);
  }, [enrollSearch, searchOwners]);

  const enrollFace = useCallback(async () => {
    if (!enrollSelected || !videoRef.current || !cameraActive) return;
    setEnrollStatus("capturing");
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast({ title: "Лицо не обнаружено", description: "Встаньте ближе к камере и смотрите в объектив", variant: "destructive" });
        setEnrollStatus("idle");
        return;
      }

      setEnrollStatus("saving");
      const descriptor = Array.from(detection.descriptor);

      await apiRequest("POST", "/api/face-recognition/enroll", {
        ownerId: enrollSelected.id,
        ownerName: enrollSelected.name,
        descriptor,
      });

      await loadDescriptors();
      setEnrollStatus("done");
      toast({ title: "Лицо зарегистрировано", description: `${enrollSelected.name} добавлен в базу распознавания` });
      setTimeout(() => {
        setEnrollOpen(false);
        setEnrollStatus("idle");
        setEnrollSelected(null);
        setEnrollSearch("");
      }, 1500);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
      setEnrollStatus("idle");
    }
  }, [enrollSelected, cameraActive, loadDescriptors, toast]);

  const deleteFace = useCallback(async (ownerId: string, name: string) => {
    try {
      await apiRequest("DELETE", `/api/face-recognition/owner/${ownerId}`);
      await loadDescriptors();
      toast({ title: "Удалено", description: `${name} удалён из базы распознавания` });
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    }
  }, [loadDescriptors, toast]);

  // ─── Status display ───────────────────────────────────────────────────────────
  const modelStepLabels = ["", "Загрузка детектора...", "Загрузка ориентиров...", "Загрузка распознавания..."];
  const modelProgress = Math.round((modelLoadStep / 3) * 100);

  const statusConfig: Record<Status, { label: string; color: string; pulse: boolean }> = {
    init:       { label: modelLoadStep > 0 ? modelStepLabels[modelLoadStep] : "Инициализация...", color: "bg-muted text-muted-foreground", pulse: modelLoadStep > 0 },
    ready:      { label: recognitionReady ? "Готов · Распознавание активно" : "Готов · Загрузка распознавания...", color: "bg-secondary text-secondary-foreground", pulse: !recognitionReady },
    face:       { label: "Лицо обнаружено — говорите!", color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300", pulse: true },
    listening:  { label: "Слушаю...", color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300", pulse: true },
    processing: { label: "Думаю...", color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300", pulse: true },
    speaking:   { label: "Отвечаю...", color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300", pulse: true },
  };
  const cfg = statusConfig[status];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Model loading progress bar — shows while recognition model downloads */}
      {modelsLoaded && !recognitionReady && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${modelProgress}%` }}
          />
        </div>
      )}
      {!modelsLoaded && (
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary animate-pulse" style={{ width: `${modelProgress}%` }} />
        </div>
      )}

      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><Bot className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-base font-semibold">Голосовой ИИ-ассистент</h1>
            <p className="text-xs text-muted-foreground">
              Ветеринарная клиника · GPT-4o{recognitionReady ? " · Распознавание лиц ✓" : modelLoadStep > 0 ? ` · ${modelStepLabels[modelLoadStep]}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${cfg.color} no-default-active-elevate ${cfg.pulse ? "animate-pulse" : ""}`}>
            {cfg.label}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)} disabled={!recognitionReady}>
            <UserPlus className="w-4 h-4 mr-1" />
            {recognitionReady ? "Зарегистрировать лицо" : "Загрузка..."}
          </Button>
          {!cameraActive ? (
            <Button size="sm" onClick={startCamera} disabled={!modelsLoaded}>
              {!modelsLoaded
                ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{modelLoadStep > 0 ? `${modelProgress}%` : "Загрузка"}</>
                : <><Camera className="w-4 h-4 mr-1" />Включить камеру</>
              }
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stopCamera}>
              <CameraOff className="w-4 h-4 mr-1" />Выключить
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Camera panel */}
        <div className="flex flex-col items-center bg-muted/30 border-r p-3 gap-3 overflow-y-auto" style={{ minWidth: 260, width: 280 }}>

          {/* Camera view */}
          <div className="relative rounded-md overflow-hidden bg-black w-full" style={{ aspectRatio: "4/3" }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline style={{ transform: "scaleX(-1)" }} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: "scaleX(-1)" }} />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <CameraOff className="w-10 h-10 opacity-40" />
                <span className="text-sm opacity-60">Камера выключена</span>
              </div>
            )}
          </div>

          {/* Recognized person card */}
          {recognizedOwner && (
            <div className="w-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-4 py-3 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">{recognizedOwner.ownerName}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Клиент распознан · {Math.round((1 - recognizedOwner.distance) * 100)}% совпадение
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3 w-full">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{errorMessage}</span>
            </div>
          )}

          {/* Status indicators */}
          <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-muted-foreground">
            <div className={`rounded-md p-2 ${faceDetectedRef.current ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-muted"}`}>
              <Camera className="w-4 h-4 mx-auto mb-1" />Лицо
            </div>
            <div className={`rounded-md p-2 ${status === "listening" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-muted"}`}>
              <Mic className="w-4 h-4 mx-auto mb-1" />Речь
            </div>
            <div className={`rounded-md p-2 ${status === "speaking" ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" : "bg-muted"}`}>
              <Volume2 className="w-4 h-4 mx-auto mb-1" />Голос
            </div>
          </div>

          {currentTranscript && (
            <div className="w-full bg-blue-50 dark:bg-blue-950 rounded-md px-3 py-2 text-sm text-blue-700 dark:text-blue-300 italic border border-blue-200 dark:border-blue-800">
              "{currentTranscript}"
            </div>
          )}

          {/* Enrolled faces list */}
          {enrolledFaces.length > 0 && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Зарегистрированные клиенты ({enrolledFaces.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {enrolledFaces.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-muted rounded-md px-3 py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-green-600" />
                      <span className="truncate max-w-[180px]">{f.ownerName}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteFace(f.ownerId, f.ownerName)}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Conversation */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
              <div className="p-4 rounded-full bg-primary/10"><Bot className="w-10 h-10 text-primary" /></div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Голосовой администратор клиники</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Включите камеру. Как только система обнаружит лицо — начните говорить. Зарегистрируйте клиентов, чтобы система их узнавала и приветствовала.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {[
                  "Кто записан сегодня?",
                  "Найди счета Петрова",
                  "Запиши кота на завтра в 10:00",
                  "Принять оплату наличными от Иванова",
                  "Какая выручка за сегодня?",
                  "Отмени запись Сидорова",
                ].map(h => (
                  <div key={h} className="bg-muted rounded-md px-3 py-2 text-xs text-muted-foreground">"{h}"</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="p-1.5 rounded-full bg-primary/10 h-fit mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-md px-4 py-2.5 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" :
                    msg.content.startsWith("Система:") ? "bg-muted/50 text-muted-foreground italic text-xs" :
                    "bg-muted text-foreground"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="p-1.5 rounded-full bg-muted h-fit mt-0.5"><User className="w-4 h-4" /></div>
                  )}
                </div>
              ))}
              {status === "processing" && (
                <div className="flex gap-3">
                  <div className="p-1.5 rounded-full bg-primary/10 h-fit"><Bot className="w-4 h-4 text-primary" /></div>
                  <div className="bg-muted rounded-md px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />Думаю...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Footer */}
          <div className="border-t px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status === "listening" && <><Mic className="w-3.5 h-3.5 text-blue-500 animate-pulse" />Слушаю...</>}
              {status === "processing" && <><Loader2 className="w-3.5 h-3.5 animate-spin" />Обрабатываю...</>}
              {status === "speaking" && <><Volume2 className="w-3.5 h-3.5 text-purple-500 animate-pulse" />Говорю...</>}
            </div>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setMessages([]); setCurrentTranscript(""); }}>
                  Очистить
                </Button>
              )}
              {status === "speaking" && (
                <Button size="sm" variant="outline" onClick={() => {
                  window.speechSynthesis.cancel();
                  isSpeakingRef.current = false;
                  setStatus(faceDetectedRef.current ? "face" : "ready");
                  if (faceDetectedRef.current) setTimeout(() => startListening(), 300);
                }}>
                  <MicOff className="w-3.5 h-3.5 mr-1" />Прервать
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Зарегистрировать лицо клиента</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Найдите клиента в базе или введите имя вручную:</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Введите ФИО клиента..."
                  value={enrollSearch}
                  onChange={e => { setEnrollSearch(e.target.value); setEnrollSelected(null); }}
                />
              </div>

              {/* Dropdown: results from DB */}
              {enrollOwners.length > 0 && !enrollSelected && (
                <div className="mt-1 border rounded-md divide-y max-h-40 overflow-y-auto">
                  {enrollOwners.map(o => (
                    <button
                      key={o.id}
                      className="w-full text-left px-3 py-2 text-sm hover-elevate"
                      onClick={() => { setEnrollSelected(o); setEnrollSearch(o.name); setEnrollOwners([]); }}
                    >
                      <span className="font-medium">{o.name}</span>
                      {o.phone && <span className="text-muted-foreground ml-2 text-xs">{o.phone}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* No results found — allow manual name */}
              {enrollSearch.trim().length >= 2 && enrollOwners.length === 0 && !enrollSelected && (
                <button
                  className="mt-2 w-full text-left px-3 py-2 text-sm border border-dashed rounded-md hover-elevate flex items-center gap-2 text-muted-foreground"
                  onClick={() => {
                    setEnrollSelected({ id: crypto.randomUUID(), name: enrollSearch.trim() });
                    setEnrollOwners([]);
                  }}
                >
                  <UserPlus className="w-4 h-4 flex-shrink-0" />
                  <span>Использовать имя <strong className="text-foreground">«{enrollSearch.trim()}»</strong> без привязки к базе</span>
                </button>
              )}
            </div>

            {/* Selected client badge */}
            {enrollSelected && (
              <div className="bg-muted rounded-md px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">{enrollSelected.name}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEnrollSelected(null); setEnrollSearch(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Попросите клиента смотреть прямо в камеру, затем нажмите кнопку ниже.
            </p>

            {/* Action button — camera off warning shown inline */}
            {!cameraActive && enrollSelected ? (
              <div className="space-y-2">
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-700 dark:text-yellow-300">
                  Для фото нужна камера. Закройте это окно, включите камеру, затем откройте регистрацию снова.
                </div>
                <Button className="w-full" variant="outline" onClick={() => { setEnrollOpen(false); startCamera(); }}>
                  <Camera className="w-4 h-4 mr-2" />Включить камеру и вернуться
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={!enrollSelected || enrollStatus === "capturing" || enrollStatus === "saving" || enrollStatus === "done"}
                onClick={enrollFace}
              >
                {enrollStatus === "capturing" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Захватываю лицо...</>}
                {enrollStatus === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохраняю...</>}
                {enrollStatus === "done" && <>Готово!</>}
                {enrollStatus === "idle" && <><Camera className="w-4 h-4 mr-2" />Сфотографировать и зарегистрировать</>}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Floating avatar window (draggable) ──────────────────────────────── */}
      {(() => {
        const COLOR: Record<Status, string> = {
          init: "#94a3b8", ready: "#94a3b8", face: "#22c55e",
          listening: "#3b82f6", processing: "#f59e0b", speaking: "#a855f7",
        };
        const LABEL: Record<Status, string> = {
          init: "", ready: "Ожидание", face: "Клиент обнаружен",
          listening: "Слушаю...", processing: "Думаю...", speaking: "Говорю...",
        };
        const c = COLOR[status];
        const isPulse = status === "listening" || status === "speaking" || status === "processing";
        const isTalk = status === "speaking";
        return (
          <div
            ref={avatarFloatRef}
            onMouseDown={onAvatarMouseDown}
            style={{
              position: "fixed",
              left: avatarPosRef.current.x,
              top: avatarPosRef.current.y,
              zIndex: 50,
              cursor: "grab",
              userSelect: "none",
              width: 150,
            }}
          >
            <div
              className="rounded-2xl overflow-hidden select-none"
              style={{
                boxShadow: isPulse
                  ? `0 0 0 3px ${c}, 0 0 20px ${c}50, 0 8px 24px rgba(0,0,0,0.35)`
                  : `0 0 0 2px ${c}60, 0 8px 24px rgba(0,0,0,0.3)`,
                transition: "box-shadow .4s",
                animation: isTalk ? "avBob .6s ease-in-out infinite" : "none",
              }}
            >
              <div className="relative" style={{ height: 170 }}>
                <img
                  src="/avatar.png"
                  alt="Ассистент"
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                />
                {/* Status dot */}
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  width: 10, height: 10, borderRadius: "50%",
                  background: c,
                  boxShadow: isPulse ? `0 0 0 3px ${c}40` : "none",
                  animation: isPulse ? "avDot 1.2s ease-in-out infinite" : "none",
                }} />
                {/* Speaking overlay */}
                {isTalk && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
                    background: `linear-gradient(to top, ${c}25, transparent)`,
                    animation: "avMouthPulse .4s ease-in-out infinite alternate",
                  }} />
                )}
                {/* Drag hint */}
                <div style={{
                  position: "absolute", top: 6, left: 8, opacity: 0.5,
                  fontSize: 10, color: "white", letterSpacing: 2, pointerEvents: "none",
                }}>⠿</div>
              </div>

              {/* Status label bar */}
              <div style={{
                background: "rgba(15,17,24,0.88)",
                backdropFilter: "blur(6px)",
                padding: "5px 10px",
                textAlign: "center",
              }}>
                {LABEL[status] ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: c }}>{LABEL[status]}</span>
                ) : (
                  <span style={{ fontSize: 11, color: "#6b7280" }}>ИИ-ассистент</span>
                )}
              </div>
            </div>

            {/* Sound wave under avatar when speaking */}
            {isTalk && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: 24, marginTop: 6 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: c, opacity: 0.8,
                    height: Math.max(4, Math.round((mouthOpen > 0.05 ? mouthOpen : 0.3 + Math.sin(i * 1.3) * 0.3) * 22)),
                    animationName: "avWave",
                    animationDuration: `${0.3 + (i % 4) * 0.1}s`,
                    animationTimingFunction: "ease-in-out",
                    animationDelay: `${i * 0.06}s`,
                    animationIterationCount: "infinite",
                    animationDirection: "alternate",
                  }} />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
