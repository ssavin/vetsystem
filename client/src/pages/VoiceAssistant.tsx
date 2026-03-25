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

const MODEL_URL = "/models";
const RECOGNITION_THRESHOLD = 0.5;

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // ─── Load models progressively ───────────────────────────────────────────────
  // Step 1: TinyFaceDetector (189KB) → unlock camera button immediately
  // Step 2+3: Landmark + Recognition models (6.5MB) in background
  const loadModels = useCallback(async () => {
    try {
      // Step 1: tiny detector — fast, unlocks the camera button
      setModelLoadStep(1);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setDetectorReady(true);
      setModelsLoaded(true); // camera button unlocks here (detection only)
      setStatus("ready");

      // Step 2: landmarks (349KB)
      setModelLoadStep(2);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      // Step 3: recognition model (6.2MB) — heaviest, loads last
      setModelLoadStep(3);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      recognitionReadyRef.current = true;
      setRecognitionReady(true);
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      // Even on error, if detector was loaded, keep it usable
      if (!detectorReady) {
        setErrorMessage("Не удалось загрузить модели. Перезагрузите страницу.");
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
        const arr = new Float32Array(item.descriptor as number[]);
        return new faceapi.LabeledFaceDescriptors(
          `${item.ownerName}__${item.ownerId}`,
          [arr]
        );
      });
      faceMatcherRef.current = new faceapi.FaceMatcher(labeled, RECOGNITION_THRESHOLD);
    } catch (err) {
      console.error("Failed to load face descriptors:", err);
    }
  }, []);

  useEffect(() => {
    loadModels().then(() => loadDescriptors());
    return () => stopEverything();
  }, []);

  // ─── Stop everything ─────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = null;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    recognitionRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    window.speechSynthesis.cancel();
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    faceDetectedRef.current = false;
  }, []);

  // ─── TTS ─────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const ru = voices.find(v => v.lang.startsWith("ru"));
    if (ru) utterance.voice = ru;
    isSpeakingRef.current = true;
    setStatus("speaking");
    utterance.onend = utterance.onerror = () => {
      isSpeakingRef.current = false;
      setStatus(faceDetectedRef.current ? "face" : "ready");
      if (faceDetectedRef.current && !isListeningRef.current) startListening();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

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
      const result = await res.json();
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
      const res = await apiRequest("GET", `/api/owners?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setEnrollOwners((data.data || data || []).slice(0, 8));
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
        <div className="flex flex-col items-center bg-muted/30 border-r p-4 gap-3" style={{ minWidth: 340, width: 380 }}>
          {/* Camera view */}
          <div className="relative rounded-md overflow-hidden bg-black w-full aspect-[4/3]">
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

          {!cameraActive && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-700 dark:text-yellow-300">
              Сначала включите камеру на главном экране
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Найдите клиента в базе:</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Введите ФИО клиента..."
                  value={enrollSearch}
                  onChange={e => { setEnrollSearch(e.target.value); setEnrollSelected(null); }}
                />
              </div>
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
            </div>

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

            <Button
              className="w-full"
              disabled={!enrollSelected || !cameraActive || enrollStatus === "capturing" || enrollStatus === "saving" || enrollStatus === "done"}
              onClick={enrollFace}
            >
              {enrollStatus === "capturing" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Захватываю лицо...</>}
              {enrollStatus === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохраняю...</>}
              {enrollStatus === "done" && <>Готово!</>}
              {enrollStatus === "idle" && <><Camera className="w-4 h-4 mr-2" />Сфотографировать и зарегистрировать</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
