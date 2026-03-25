type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

const avatarSrc = "/avatar.png";

interface Props {
  status: Status;
  mouthOpen: number; // 0–1
}

const STATUS_COLOR: Record<Status, string> = {
  init:       "#94a3b8",
  ready:      "#94a3b8",
  face:       "#22c55e",
  listening:  "#3b82f6",
  processing: "#f59e0b",
  speaking:   "#a855f7",
};

const STATUS_LABEL: Record<Status, string> = {
  init:       "",
  ready:      "Ожидание",
  face:       "Клиент обнаружен",
  listening:  "Слушаю...",
  processing: "Думаю...",
  speaking:   "Говорю...",
};

// Waveform bars heights when speaking (simulated lipsync rhythm)
const WAVE_BARS = 12;

export function AvatarFace({ status, mouthOpen }: Props) {
  const color = STATUS_COLOR[status];
  const isPulsing = status === "listening" || status === "speaking" || status === "processing";
  const isSpeaking = status === "speaking";
  const isListening = status === "listening";

  return (
    <div className="flex flex-col items-center gap-3 select-none">

      {/* Photo with animated ring */}
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          width: 190,
          height: 210,
          boxShadow: isPulsing
            ? `0 0 0 3px ${color}, 0 0 24px ${color}60, 0 8px 32px rgba(0,0,0,0.2)`
            : `0 0 0 2px ${color}50, 0 8px 24px rgba(0,0,0,0.15)`,
          animation: isSpeaking ? "avBob 0.6s ease-in-out infinite" : "none",
          transition: "box-shadow 0.4s ease",
        }}
      >
        <img
          src={avatarSrc}
          alt="Ассистент"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />

        {/* Listening overlay — blue shimmer on face */}
        {isListening && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${color}10 0%, transparent 60%, ${color}08 100%)`,
              animation: "avShimmer 1.5s ease-in-out infinite alternate",
            }}
          />
        )}

        {/* Speaking overlay — subtle mouth-area pulse */}
        {isSpeaking && (
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "28%",
              background: `linear-gradient(to top, ${color}20, transparent)`,
              animation: "avMouthPulse 0.4s ease-in-out infinite alternate",
            }}
          />
        )}

        {/* Status badge */}
        <div
          className="absolute top-2 right-2 rounded-full"
          style={{
            width: 12,
            height: 12,
            background: color,
            boxShadow: isPulsing ? `0 0 0 3px ${color}40` : "none",
            animation: isPulsing ? "avDot 1.2s ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* Sound wave bars — only when speaking */}
      {isSpeaking && (
        <div className="flex items-end gap-0.5" style={{ height: 32 }}>
          {Array.from({ length: WAVE_BARS }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 4,
                background: color,
                opacity: 0.85,
                animationName: "avWave",
                animationDuration: `${0.3 + (i % 4) * 0.12}s`,
                animationTimingFunction: "ease-in-out",
                animationDelay: `${i * 0.05}s`,
                animationIterationCount: "infinite",
                animationDirection: "alternate",
                // height driven by mouthOpen when available, otherwise generic
                height: Math.max(
                  4,
                  Math.round((mouthOpen > 0.05 ? mouthOpen : 0.3 + Math.sin(i * 1.2) * 0.3) * 28)
                ),
              }}
            />
          ))}
        </div>
      )}

      {/* Processing dots */}
      {status === "processing" && (
        <div className="flex gap-1.5 items-center h-8">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 8, height: 8,
                background: color,
                animation: `avDot 0.8s ease-in-out ${i * 0.2}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {/* Listening mic pulse */}
      {status === "listening" && (
        <div className="flex items-center gap-2 h-8">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 32, height: 32,
              background: `${color}20`,
              border: `2px solid ${color}`,
              animation: "avDot 0.9s ease-in-out infinite alternate",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm-1 3a1 1 0 0 1 2 0v8a1 1 0 0 1-2 0V4zM7 11a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.93V21h-2v-3.07A7 7 0 0 1 5 11h2z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Status label */}
      {STATUS_LABEL[status] && (
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full transition-all duration-300"
          style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}

      <style>{`
        @keyframes avBob {
          0%,100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.005); }
        }
        @keyframes avShimmer {
          0% { opacity: 0.4; }
          100% { opacity: 0.9; }
        }
        @keyframes avMouthPulse {
          0% { opacity: 0.3; height: 25%; }
          100% { opacity: 0.7; height: 32%; }
        }
        @keyframes avDot {
          0% { opacity: 0.4; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes avWave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
