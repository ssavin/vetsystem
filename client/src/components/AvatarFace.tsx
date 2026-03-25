type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

interface Props {
  status: Status;
  mouthOpen: number; // 0–1
}

const STATUS_RING: Record<Status, string> = {
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

export function AvatarFace({ status, mouthOpen }: Props) {
  const ring = STATUS_RING[status];
  const isPulsing = status === "listening" || status === "speaking" || status === "processing";
  const isSpeaking = status === "speaking";

  const mouthRy = Math.max(0, mouthOpen * 17);
  const showTeeth = mouthOpen > 0.28;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <svg
        viewBox="0 0 220 220"
        style={{
          width: 200,
          height: 200,
          display: "block",
          filter: `drop-shadow(0 4px 16px ${ring}50)`,
          transition: "filter 0.4s",
        }}
      >
        <defs>
          <style>{`
            @keyframes avatarBlink {
              0%, 88%, 100% { transform: scaleY(1); }
              92%, 96% { transform: scaleY(0.06); }
            }
            @keyframes avatarBob {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
            @keyframes avatarRingPulse {
              0%, 100% { stroke-width: 3; opacity: 0.45; }
              50% { stroke-width: 7; opacity: 0.85; }
            }
            .av-container {
              animation: ${isSpeaking ? "avatarBob 0.45s ease-in-out infinite" : "none"};
            }
            .av-eye-l {
              transform-origin: 76px 115px;
              animation: avatarBlink 3.9s ease-in-out infinite;
            }
            .av-eye-r {
              transform-origin: 134px 115px;
              animation: avatarBlink 3.9s ease-in-out 0.2s infinite;
            }
            .av-ring {
              animation: ${isPulsing ? "avatarRingPulse 1.6s ease-in-out infinite" : "none"};
            }
          `}</style>

          <radialGradient id="skinGrad" cx="50%" cy="38%">
            <stop offset="0%" stopColor="#F9DCBA"/>
            <stop offset="100%" stopColor="#E0A870"/>
          </radialGradient>
          <radialGradient id="irisGrad" cx="38%" cy="32%">
            <stop offset="0%" stopColor="#8ECAE6"/>
            <stop offset="100%" stopColor="#2563AB"/>
          </radialGradient>
          <clipPath id="headClip">
            <ellipse cx="110" cy="122" rx="82" ry="94"/>
          </clipPath>
        </defs>

        {/* Status ring — animated SVG circle */}
        <circle
          cx="110" cy="110" r="105"
          fill="none"
          stroke={ring}
          strokeWidth="3"
          opacity="0.45"
          className="av-ring"
        />

        {/* Animated head container */}
        <g className="av-container">
          {/* Neck */}
          <rect x="92" y="197" width="36" height="23" rx="8" fill="#DFA878"/>

          {/* Shirt / collar */}
          <path d="M42,220 L68,200 Q110,215 152,200 L178,220 Z" fill="#3B5FC0"/>
          <path d="M110,214 L98,220 L122,220 Z" fill="#2A4BAA"/>

          {/* Head */}
          <ellipse cx="110" cy="122" rx="82" ry="94" fill="url(#skinGrad)"/>

          {/* Hair (back) */}
          <ellipse cx="110" cy="62" rx="84" ry="58" fill="#2C1810"/>

          {/* Hair (front hairline) */}
          <path d="M28,108 Q30,48 110,30 Q190,48 192,108" fill="#2C1810"/>

          {/* Forehead skin on top of hair */}
          <ellipse cx="110" cy="114" rx="80" ry="87" fill="url(#skinGrad)"/>

          {/* Left ear */}
          <ellipse cx="28" cy="122" rx="10" ry="14" fill="#D9A070"/>
          <ellipse cx="30" cy="122" rx="6" ry="9" fill="url(#skinGrad)"/>

          {/* Right ear */}
          <ellipse cx="192" cy="122" rx="10" ry="14" fill="#D9A070"/>
          <ellipse cx="190" cy="122" rx="6" ry="9" fill="url(#skinGrad)"/>

          {/* ── Left eye (blinks) ── */}
          <g className="av-eye-l">
            <ellipse cx="76" cy="115" rx="18" ry="14" fill="white"/>
            <circle cx="76" cy="116" r="10" fill="url(#irisGrad)"/>
            <circle cx="76" cy="116" r="5" fill="#111"/>
            <circle cx="81" cy="111" r="2.5" fill="white" opacity="0.88"/>
            {/* Upper eyelid */}
            <ellipse cx="76" cy="103" rx="18" ry="7" fill="#2C1810" opacity="0.78"/>
          </g>

          {/* ── Right eye (blinks) ── */}
          <g className="av-eye-r">
            <ellipse cx="134" cy="115" rx="18" ry="14" fill="white"/>
            <circle cx="134" cy="116" r="10" fill="url(#irisGrad)"/>
            <circle cx="134" cy="116" r="5" fill="#111"/>
            <circle cx="139" cy="111" r="2.5" fill="white" opacity="0.88"/>
            <ellipse cx="134" cy="103" rx="18" ry="7" fill="#2C1810" opacity="0.78"/>
          </g>

          {/* Eyebrows */}
          <path d="M54,96 Q76,87 94,92" stroke="#2C1810" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <path d="M126,92 Q144,87 166,96" stroke="#2C1810" strokeWidth="3.5" strokeLinecap="round" fill="none"/>

          {/* Nose */}
          <path d="M106,140 Q110,152 114,140" stroke="#C8906A" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <ellipse cx="102" cy="149" rx="4.5" ry="2.8" fill="#CEAA84" opacity="0.45"/>
          <ellipse cx="118" cy="149" rx="4.5" ry="2.8" fill="#CEAA84" opacity="0.45"/>

          {/* Cheek blush */}
          <ellipse cx="62" cy="142" rx="17" ry="10" fill="#FFB0A0" opacity="0.18"/>
          <ellipse cx="158" cy="142" rx="17" ry="10" fill="#FFB0A0" opacity="0.18"/>

          {/* ── Mouth ── */}
          {mouthOpen < 0.08 ? (
            /* Smile (closed) */
            <path d="M84,167 Q110,178 136,167" stroke="#C07070" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
          ) : (
            /* Open mouth */
            <>
              <ellipse cx="110" cy="169" rx="25" ry={mouthRy + 5} fill="#6B1C0C"/>
              {/* Upper lip */}
              <path
                d="M84,165 Q97,158 110,161 Q123,158 136,165 Q128,173 110,174 Q92,173 84,165 Z"
                fill="#C86060"
              />
              {/* Lower lip */}
              <path
                d={`M86,${167 + mouthRy * 0.6} Q110,${178 + mouthRy * 0.5} 134,${167 + mouthRy * 0.6} Q122,${174 + mouthRy * 0.4} 110,${175 + mouthRy * 0.4} Q98,${174 + mouthRy * 0.4} 86,${167 + mouthRy * 0.6} Z`}
                fill="#D87878"
              />
              {/* Teeth */}
              {showTeeth && (
                <ellipse cx="110" cy="165" rx="19" ry={Math.min(7, mouthRy * 0.45)} fill="white" opacity="0.92"/>
              )}
            </>
          )}

          {/* Hair highlight streaks */}
          <path d="M46,82 Q65,54 110,42" stroke="#4A2820" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round"/>
          <path d="M62,70 Q80,46 110,38" stroke="#6A3828" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Status label */}
      {STATUS_LABEL[status] && (
        <span
          className="text-xs font-medium px-3 py-1 rounded-full transition-all duration-300"
          style={{ color: ring, background: `${ring}18`, border: `1px solid ${ring}40` }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}
