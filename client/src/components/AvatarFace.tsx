type Status = "init" | "ready" | "face" | "listening" | "processing" | "speaking";

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

export function AvatarFace({ status, mouthOpen }: Props) {
  const color = STATUS_COLOR[status];
  const isPulsing = status === "listening" || status === "speaking" || status === "processing";
  const isSpeaking = status === "speaking";

  // Mouth: 0 = closed smile, 1 = wide open
  const mouthRy = Math.max(0, mouthOpen * 14);
  const showTeeth = mouthOpen > 0.3;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <svg viewBox="0 0 200 200" width="196" height="196">
        <defs>
          <style>{`
            @keyframes avBlink {
              0%,85%,100%{transform:scaleY(1)}
              90%,95%{transform:scaleY(0.07)}
            }
            @keyframes avBob {
              0%,100%{transform:translateY(0)}
              50%{transform:translateY(-3px)}
            }
            @keyframes avRing {
              0%,100%{opacity:.45;r:95}
              50%{opacity:.9;r:97}
            }
            .av-face { animation:${isSpeaking ? "avBob .5s ease-in-out infinite" : "none"} }
            .av-el { transform-origin:68px 96px; animation:avBlink 3.6s ease-in-out infinite }
            .av-er { transform-origin:132px 96px; animation:avBlink 3.6s ease-in-out .2s infinite }
            .av-ring { animation:${isPulsing ? "avRing 1.5s ease-in-out infinite" : "none"} }
          `}</style>

          <linearGradient id="avSkin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDDCB0"/>
            <stop offset="100%" stopColor="#F0B880"/>
          </linearGradient>
          <linearGradient id="avHair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D1F0A"/>
            <stop offset="100%" stopColor="#6B3318"/>
          </linearGradient>
          <linearGradient id="avCoat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f4ff"/>
            <stop offset="100%" stopColor="#dce8ff"/>
          </linearGradient>
          <radialGradient id="avBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="100" r="98" fill="url(#avBg)"/>

        {/* Status ring */}
        <circle
          cx="100" cy="100" r="95"
          fill="none" stroke={color} strokeWidth="3"
          opacity=".45" className="av-ring"
          style={{ transition: "stroke .4s" }}
        />

        <g className="av-face">
          {/* White coat shoulders */}
          <path d="M12,200 L30,155 Q65,178 100,180 Q135,178 170,155 L188,200 Z" fill="url(#avCoat)"/>
          {/* Coat lapels */}
          <path d="M100,180 L86,165 L75,200 Z" fill="white" opacity=".7"/>
          <path d="M100,180 L114,165 L125,200 Z" fill="white" opacity=".7"/>
          {/* Shirt under coat */}
          <path d="M86,165 L100,160 L114,165 L100,180 Z" fill="#e0e8ff"/>

          {/* Neck */}
          <rect x="86" y="158" width="28" height="22" rx="6" fill="#F0B880"/>

          {/* Head */}
          <ellipse cx="100" cy="104" rx="72" ry="80" fill="url(#avSkin)"/>

          {/* Hair cap */}
          <path d="M28,90 Q32,30 100,26 Q168,30 172,90" fill="url(#avHair)"/>
          {/* Hair bottom edge — natural hairline */}
          <ellipse cx="100" cy="100" rx="70" ry="76" fill="url(#avSkin)"/>
          <path d="M32,87 Q36,36 100,34 Q164,36 168,87" fill="url(#avHair)"/>

          {/* Ears */}
          <ellipse cx="28" cy="105" rx="9" ry="13" fill="#E8A86C"/>
          <ellipse cx="172" cy="105" rx="9" ry="13" fill="#E8A86C"/>

          {/* Face on top of hair */}
          <ellipse cx="100" cy="108" rx="68" ry="73" fill="url(#avSkin)"/>

          {/* Cheek blush */}
          <ellipse cx="60" cy="125" rx="16" ry="9" fill="#F8A070" opacity=".15"/>
          <ellipse cx="140" cy="125" rx="16" ry="9" fill="#F8A070" opacity=".15"/>

          {/* ── Left eye (blinks) ── */}
          <g className="av-el">
            <ellipse cx="68" cy="96" rx="15" ry="14" fill="white"/>
            <circle cx="68" cy="97" r="8.5" fill="#2A2A2A"/>
            <circle cx="72" cy="93" r="3" fill="white" opacity=".85"/>
          </g>

          {/* ── Right eye (blinks) ── */}
          <g className="av-er">
            <ellipse cx="132" cy="96" rx="15" ry="14" fill="white"/>
            <circle cx="132" cy="97" r="8.5" fill="#2A2A2A"/>
            <circle cx="136" cy="93" r="3" fill="white" opacity=".85"/>
          </g>

          {/* Eyebrows */}
          <path d="M50,78 Q68,70 84,75" stroke="#3D1F0A" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <path d="M116,75 Q132,70 150,78" stroke="#3D1F0A" strokeWidth="3.5" strokeLinecap="round" fill="none"/>

          {/* Nose – minimal */}
          <path d="M96,122 Q100,130 104,122" stroke="#C8906A" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

          {/* ── Mouth ── */}
          {mouthOpen < 0.07 ? (
            /* Closed smile */
            <path
              d="M74,140 Q100,152 126,140"
              stroke="#C06060" strokeWidth="3" fill="none" strokeLinecap="round"
            />
          ) : (
            /* Open */
            <>
              {/* Cavity */}
              <ellipse cx="100" cy="142" rx="26" ry={mouthRy + 5} fill="#5A1510"/>
              {/* Upper lip */}
              <path
                d="M74,138 Q87,131 100,134 Q113,131 126,138 Q116,147 100,148 Q84,147 74,138 Z"
                fill="#C06868"
              />
              {/* Lower lip */}
              <ellipse cx="100" cy={145 + mouthRy * 0.55} rx="24" ry="6" fill="#D07878"/>
              {/* Teeth */}
              {showTeeth && (
                <ellipse cx="100" cy="139" rx="20" ry={Math.min(6, mouthRy * 0.45)} fill="white" opacity=".9"/>
              )}
            </>
          )}

          {/* Stethoscope hint (tiny detail at collar) */}
          <circle cx="100" cy="170" r="4" fill="none" stroke="#8899BB" strokeWidth="2"/>
          <line x1="100" y1="166" x2="100" y2="162" stroke="#8899BB" strokeWidth="2"/>
        </g>
      </svg>

      {/* Status label */}
      {STATUS_LABEL[status] && (
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full transition-all duration-300"
          style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}
