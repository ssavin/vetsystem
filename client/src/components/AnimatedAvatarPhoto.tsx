// SVG overlay animation on top of the real photo.
// All positions are tuned for the generated avatar.png (3:4 portrait, head+shoulders).

type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

interface Props {
  status: Status;
  mouthOpen: number; // 0–1 from Web Audio AnalyserNode
  width?: number;
  height?: number;
}

// ─── Feature positions (tweak these to align with the actual photo) ──────────
// Expressed in SVG user units = pixels at the default w×h
const FACE = {
  // Eyes: cx/cy = iris center, rx/ry = eyelid coverage size
  eyeL:  { cx: 56,  cy: 64, rx: 11, ry: 7  },
  eyeR:  { cx: 93,  cy: 64, rx: 11, ry: 7  },
  // Mouth: cx/cy = center of closed lips, rx = half-width
  mouth: { cx: 75,  cy: 107, rx: 16, ry: 4 },
};

// Approximate skin tone of the photo forehead/cheek area
const SKIN      = "#f2c090";
const LIP_TOP   = "#c47060";
const LIP_BOT   = "#b86050";
const CAVITY    = "#2e0e08";

export function AnimatedAvatarPhoto({
  status,
  mouthOpen,
  width  = 150,
  height = 170,
}: Props) {
  const isSpeaking = status === "speaking";
  const isActive   = status === "listening" || status === "speaking" || status === "processing";

  // Mouth cavity opens proportionally to amplitude
  const cavRy  = Math.max(0, mouthOpen * 14);
  const lipGap = Math.max(0, mouthOpen * 16); // how far lower lip drops

  const W = width;
  const H = height;

  // Scale the hardcoded 150×170 coords if size changes
  const sx = W / 150;
  const sy = H / 170;

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        // Micro head movements applied to the whole container
        animation: isSpeaking
          ? "headBob 1.8s ease-in-out infinite"
          : isActive
          ? "headSway 4s ease-in-out infinite"
          : "headIdle 6s ease-in-out infinite",
      }}
    >
      {/* Base photo */}
      <img
        src="/avatar.png"
        alt="Ассистент"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
          display: "block",
          borderRadius: "inherit",
        }}
      />

      {/* SVG overlay — eyes + mouth */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <style>{`
          @keyframes blinkL {
            0%,82%,100% { transform: scaleY(0.04); }
            86%,94%     { transform: scaleY(1); }
          }
          @keyframes blinkR {
            0%,80%,100% { transform: scaleY(0.04); }
            84%,92%     { transform: scaleY(1); }
          }
        `}</style>

        <defs>
          {/* Eyelid gradient — skin tone fading to lash shadow */}
          <linearGradient id="lidGradL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={SKIN} stopOpacity="1" />
            <stop offset="72%"  stopColor={SKIN} stopOpacity="0.97" />
            <stop offset="100%" stopColor="#a06030" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="lidGradR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={SKIN} stopOpacity="1" />
            <stop offset="72%"  stopColor={SKIN} stopOpacity="0.97" />
            <stop offset="100%" stopColor="#a06030" stopOpacity="0.7" />
          </linearGradient>

          {/* Lip gradients */}
          <radialGradient id="lipTop" cx="50%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#d88070" />
            <stop offset="100%" stopColor={LIP_TOP} />
          </radialGradient>
          <radialGradient id="lipBot" cx="50%" cy="60%" r="60%">
            <stop offset="0%"   stopColor="#c47060" />
            <stop offset="100%" stopColor={LIP_BOT} />
          </radialGradient>
        </defs>

        {/* ── LEFT EYELID ──────────────────────────────────────────────────── */}
        <ellipse
          cx={FACE.eyeL.cx * sx}
          cy={FACE.eyeL.cy * sy}
          rx={(FACE.eyeL.rx + 1) * sx}
          ry={(FACE.eyeL.ry + 1) * sy}
          fill="url(#lidGradL)"
          style={{
            transformOrigin: `${FACE.eyeL.cx * sx}px ${(FACE.eyeL.cy - FACE.eyeL.ry) * sy}px`,
            animation: "blinkL 3.8s ease-in-out infinite",
          }}
        />

        {/* ── RIGHT EYELID ─────────────────────────────────────────────────── */}
        <ellipse
          cx={FACE.eyeR.cx * sx}
          cy={FACE.eyeR.cy * sy}
          rx={(FACE.eyeR.rx + 1) * sx}
          ry={(FACE.eyeR.ry + 1) * sy}
          fill="url(#lidGradR)"
          style={{
            transformOrigin: `${FACE.eyeR.cx * sx}px ${(FACE.eyeR.cy - FACE.eyeR.ry) * sy}px`,
            animation: "blinkR 3.8s ease-in-out 0.25s infinite",
          }}
        />

        {/* ── MOUTH ────────────────────────────────────────────────────────── */}
        {/* 1. Dark cavity (only visible when mouth opens) */}
        {cavRy > 0.5 && (
          <ellipse
            cx={FACE.mouth.cx * sx}
            cy={(FACE.mouth.cy + 2) * sy}
            rx={(FACE.mouth.rx - 3) * sx}
            ry={cavRy * sy}
            fill={CAVITY}
          />
        )}

        {/* 2. Upper lip */}
        <ellipse
          cx={FACE.mouth.cx * sx}
          cy={(FACE.mouth.cy - FACE.mouth.ry * 0.3) * sy}
          rx={(FACE.mouth.rx + 1) * sx}
          ry={(FACE.mouth.ry + (cavRy > 1 ? 1.5 : 0)) * sy}
          fill="url(#lipTop)"
          opacity="0.82"
        />

        {/* 3. Lower lip (drops when speaking) */}
        <ellipse
          cx={FACE.mouth.cx * sx}
          cy={(FACE.mouth.cy + FACE.mouth.ry * 0.6 + lipGap * 0.55) * sy}
          rx={(FACE.mouth.rx - 1) * sx}
          ry={(FACE.mouth.ry + (cavRy > 1 ? 2 : 0)) * sy}
          fill="url(#lipBot)"
          opacity="0.78"
        />

        {/* 4. Teeth strip (only when mouth wide open) */}
        {mouthOpen > 0.3 && (
          <ellipse
            cx={FACE.mouth.cx * sx}
            cy={(FACE.mouth.cy + 1) * sy}
            rx={(FACE.mouth.rx - 5) * sx}
            ry={Math.min(5, cavRy * 0.38) * sy}
            fill="white"
            opacity="0.88"
          />
        )}
      </svg>
    </div>
  );
}
