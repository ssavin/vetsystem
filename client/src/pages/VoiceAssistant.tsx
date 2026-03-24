import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Mic, MicOff, Camera, CameraOff, Bot, User, Volume2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

  const [status, setStatus] = useState<Status>("init");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadModels = useCallback(async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      setErrorMessage("Не удалось загрузить модели распознавания лица");
    }
  }, []);

  useEffect(() => {
    loadModels();
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    window.speechSynthesis.cancel();
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    faceDetectedRef.current = false;
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith("ru"));
    if (ruVoice) utterance.voice = ruVoice;

    isSpeakingRef.current = true;
    setStatus("speaking");

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (faceDetectedRef.current) {
        setStatus("face");
        startListening();
      } else {
        setStatus("ready");
      }
      onEnd?.();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      if (faceDetectedRef.current) setStatus("face");
      else setStatus("ready");
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const sendToAI = useCallback(async (text: string) => {
    setStatus("processing");
    setCurrentTranscript("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      return updated;
    });

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const data = await apiRequest("POST", "/api/voice-assistant/chat", { text, history });
      const result = await data.json();
      const response: string = result.response || "Не могу ответить на этот вопрос.";

      const assistantMsg: Message = { role: "assistant", content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);

      speak(response);
    } catch (err: any) {
      console.error("AI error:", err);
      const errMsg = "Произошла ошибка при обработке запроса. Попробуйте снова.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg, timestamp: new Date() }]);
      speak(errMsg);
    }
  }, [messages, speak]);

  const startListening = useCallback(() => {
    if (isListeningRef.current || isSpeakingRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Web Speech API не поддерживается в вашем браузере. Используйте Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        setCurrentTranscript("");
        if (transcript.trim().length > 1) {
          sendToAI(transcript.trim());
        } else {
          if (faceDetectedRef.current) {
            setStatus("face");
            startListening();
          }
        }
      } else {
        setCurrentTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        isListeningRef.current = false;
        recognitionRef.current = null;
        if (faceDetectedRef.current && !isSpeakingRef.current) {
          setStatus("face");
          setTimeout(() => startListening(), 300);
        }
      } else if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
        isListeningRef.current = false;
        recognitionRef.current = null;
        if (faceDetectedRef.current && !isSpeakingRef.current) {
          setStatus("face");
        }
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      isListeningRef.current = false;
      recognitionRef.current = null;
    }
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
  }, []);

  const startCamera = useCallback(async () => {
    if (!modelsLoaded) {
      toast({ title: "Подождите", description: "Загрузка моделей..." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus("ready");
      setErrorMessage("");
      startDetectionLoop();
    } catch (err: any) {
      setErrorMessage("Нет доступа к камере. Разрешите использование камеры в браузере.");
    }
  }, [modelsLoaded]);

  const stopCamera = useCallback(() => {
    stopEverything();
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setStatus("init");
    setCurrentTranscript("");
  }, [stopEverything]);

  const startDetectionLoop = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

      try {
        const detections = await faceapi.detectAllFaces(video, options);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const hasFace = detections.length > 0;

        if (hasFace) {
          const resized = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });

          resized.forEach(det => {
            const { x, y, width, height } = det.box;
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#22c55e";
            ctx.shadowBlur = 8;
            ctx.strokeRect(x, y, width, height);

            const cornerSize = 16;
            ctx.lineWidth = 3;
            [[x, y], [x + width - cornerSize, y], [x, y + height - cornerSize], [x + width - cornerSize, y + height - cornerSize]].forEach(([cx, cy], i) => {
              ctx.beginPath();
              if (i === 0) { ctx.moveTo(cx, cy + cornerSize); ctx.lineTo(cx, cy); ctx.lineTo(cx + cornerSize, cy); }
              else if (i === 1) { ctx.moveTo(cx, cy + cornerSize); ctx.lineTo(cx + cornerSize, cy); ctx.lineTo(cx + cornerSize, cy); }
              else if (i === 2) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + cornerSize); ctx.lineTo(cx + cornerSize, cy + cornerSize); }
              else { ctx.moveTo(cx, cy + cornerSize); ctx.lineTo(cx + cornerSize, cy + cornerSize); ctx.lineTo(cx + cornerSize, cy); }
              ctx.stroke();
            });
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
          stopListening();
          if (!isSpeakingRef.current) setStatus("ready");
        }
      } catch {}
    }, 200);
  }, [startListening, stopListening]);

  const statusConfig: Record<Status, { label: string; color: string; pulse: boolean }> = {
    init: { label: "Инициализация...", color: "bg-muted text-muted-foreground", pulse: false },
    ready: { label: "Готов — направьте камеру на лицо", color: "bg-secondary text-secondary-foreground", pulse: false },
    face: { label: "Лицо обнаружено — говорите!", color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300", pulse: true },
    listening: { label: "Слушаю...", color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300", pulse: true },
    processing: { label: "Думаю...", color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300", pulse: true },
    speaking: { label: "Отвечаю...", color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300", pulse: true },
  };

  const cfg = statusConfig[status];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Голосовой ИИ-ассистент</h1>
            <p className="text-xs text-muted-foreground">Ветеринарная клиника · GPT-4o</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${cfg.color} no-default-active-elevate ${cfg.pulse ? "animate-pulse" : ""}`}>
            {cfg.label}
          </Badge>
          {!cameraActive ? (
            <Button size="sm" onClick={startCamera} disabled={!modelsLoaded}>
              {!modelsLoaded ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Загрузка</>
              ) : (
                <><Camera className="w-4 h-4 mr-1" />Включить камеру</>
              )}
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stopCamera}>
              <CameraOff className="w-4 h-4 mr-1" />Выключить
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col items-center justify-center bg-muted/30 border-r p-4 gap-3" style={{ minWidth: 340, width: 380 }}>
          <div className="relative rounded-md overflow-hidden bg-black w-full aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ transform: "scaleX(-1)" }}
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <CameraOff className="w-10 h-10 opacity-40" />
                <span className="text-sm opacity-60">Камера выключена</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3 w-full">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-muted-foreground">
            <div className={`rounded-md p-2 ${faceDetectedRef.current ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-muted"}`}>
              <Camera className="w-4 h-4 mx-auto mb-1" />
              Лицо
            </div>
            <div className={`rounded-md p-2 ${status === "listening" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-muted"}`}>
              <Mic className="w-4 h-4 mx-auto mb-1" />
              Речь
            </div>
            <div className={`rounded-md p-2 ${status === "speaking" ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" : "bg-muted"}`}>
              <Volume2 className="w-4 h-4 mx-auto mb-1" />
              Голос
            </div>
          </div>

          {currentTranscript && (
            <div className="w-full bg-blue-50 dark:bg-blue-950 rounded-md px-3 py-2 text-sm text-blue-700 dark:text-blue-300 italic border border-blue-200 dark:border-blue-800">
              "{currentTranscript}"
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center px-2">
            Система автоматически включает микрофон, когда обнаруживает лицо в кадре
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
              <div className="p-4 rounded-full bg-primary/10">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Голосовой ассистент клиники</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Включите камеру и встаньте перед ней. Как только система обнаружит ваше лицо, начните говорить — ассистент вас услышит и ответит голосом.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2 max-w-md">
                {[
                  "Сколько записей на сегодня?",
                  "Напомни правила вакцинации собак",
                  "Как добавить нового клиента?",
                  "Что такое парвовирус?",
                ].map(hint => (
                  <div key={hint} className="bg-muted rounded-md px-3 py-2 text-xs">
                    "{hint}"
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="p-1.5 rounded-full bg-primary/10 h-fit mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-md px-4 py-2.5 text-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="p-1.5 rounded-full bg-muted h-fit mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {status === "processing" && (
                <div className="flex gap-3 justify-start">
                  <div className="p-1.5 rounded-full bg-primary/10 h-fit mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-md px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Думаю...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="border-t px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status === "listening" && (
                <><Mic className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Слушаю...</>
              )}
              {status === "processing" && (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Обрабатываю запрос...</>
              )}
              {status === "speaking" && (
                <><Volume2 className="w-3.5 h-3.5 text-purple-500 animate-pulse" /> Говорю ответ...</>
              )}
            </div>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMessages([]);
                    setCurrentTranscript("");
                    window.speechSynthesis.cancel();
                    isSpeakingRef.current = false;
                    if (faceDetectedRef.current && !isListeningRef.current) {
                      setStatus("face");
                      setTimeout(() => startListening(), 300);
                    }
                  }}
                >
                  Очистить историю
                </Button>
              )}
              {status === "speaking" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    isSpeakingRef.current = false;
                    if (faceDetectedRef.current) {
                      setStatus("face");
                      setTimeout(() => startListening(), 300);
                    } else {
                      setStatus("ready");
                    }
                  }}
                >
                  <MicOff className="w-3.5 h-3.5 mr-1" />
                  Прервать
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
