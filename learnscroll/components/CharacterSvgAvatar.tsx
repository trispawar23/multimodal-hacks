"use client";

/**
 * CharacterSvgAvatar
 *
 * Adapted from Luminary interactive-avatar-system/CharacterAvatar.tsx.
 * Renders a fully SVG-drawn portrait for each LearnScroll personality with:
 *   - Biological eye-blinking (random 4s–6s interval, 150ms blink window)
 *   - Lip-sync mouth animation (120ms oscillation while isSpeaking)
 *
 * Map of personality IDs → SVG style presets lives at the bottom of this file.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CharacterSvgAvatarProps {
  personalityId: string;
  personalityName?: string;
  isSpeaking: boolean;
  /** 0–1 intensity multiplier for mouth oscillation amplitude */
  intensity?: number;
}

// ─── SVG style schema (mirrors CharacterAvatar's CharacterSvgStyle) ──────────

interface SvgStyle {
  skinColor: string;
  hairColor: string;
  hairStyle: "classic" | "wild" | "curly" | "long" | "short" | "bald" | "bob" | "braids" | "crown";
  clothingColor: string;
  clothingStyle: "robe" | "suit" | "toga" | "armor" | "modern" | "academic" | "labcoat";
  bgColorStart: string;
  bgColorEnd: string;
  accessory: "none" | "glasses" | "glasses-gold" | "monocle" | "laurel-wreath" | "royal-crown" | "ruler-hat" | "scientist-goggles" | "earrings";
  facialHair: "none" | "mustache" | "full-beard" | "stubble" | "white-beard" | "goatee";
}

const PERSONALITY_STYLES: Record<string, SvgStyle> = {
  newton: {
    skinColor: "#fdf3e7", hairColor: "#e9eff5", hairStyle: "wild",
    clothingColor: "#1e1b4b", clothingStyle: "academic",
    bgColorStart: "#1c281e", bgColorEnd: "#0f1710",
    accessory: "none", facialHair: "none",
  },
  curie: {
    skinColor: "#ffe9dc", hairColor: "#3d281a", hairStyle: "bob",
    clothingColor: "#f8fafc", clothingStyle: "labcoat",
    bgColorStart: "#311b92", bgColorEnd: "#120530",
    accessory: "none", facialHair: "none",
  },
  darwin: {
    skinColor: "#edcbb7", hairColor: "#1e130c", hairStyle: "short",
    clothingColor: "#2d3748", clothingStyle: "suit",
    bgColorStart: "#1b1b22", bgColorEnd: "#0a0a0f",
    accessory: "none", facialHair: "white-beard",
  },
  euler: {
    skinColor: "#fdf3e7", hairColor: "#cfd6df", hairStyle: "curly",
    clothingColor: "#2d2b26", clothingStyle: "robe",
    bgColorStart: "#1a237e", bgColorEnd: "#0a0d2a",
    accessory: "none", facialHair: "none",
  },
  hypatia: {
    skinColor: "#ebbea3", hairColor: "#3d281a", hairStyle: "long",
    clothingColor: "#a83232", clothingStyle: "toga",
    bgColorStart: "#880e4f", bgColorEnd: "#2a0210",
    accessory: "laurel-wreath", facialHair: "none",
  },
  turing: {
    skinColor: "#ffe9dc", hairColor: "#1e130c", hairStyle: "short",
    clothingColor: "#2d3748", clothingStyle: "suit",
    bgColorStart: "#1b1b22", bgColorEnd: "#0a0a0f",
    accessory: "none", facialHair: "none",
  },
  tesla: {
    skinColor: "#fdf3e7", hairColor: "#121214", hairStyle: "classic",
    clothingColor: "#2d3748", clothingStyle: "suit",
    bgColorStart: "#004d40", bgColorEnd: "#001a14",
    accessory: "none", facialHair: "mustache",
  },
  aristotle: {
    skinColor: "#ebbea3", hairColor: "#cfd6df", hairStyle: "curly",
    clothingColor: "#a83232", clothingStyle: "toga",
    bgColorStart: "#3e2723", bgColorEnd: "#150a06",
    accessory: "laurel-wreath", facialHair: "full-beard",
  },
  shakespeare: {
    skinColor: "#fdf3e7", hairColor: "#3d281a", hairStyle: "curly",
    clothingColor: "#2d2b26", clothingStyle: "robe",
    bgColorStart: "#1b1b22", bgColorEnd: "#0a0a0f",
    accessory: "none", facialHair: "goatee",
  },
  cleopatra: {
    skinColor: "#cca07a", hairColor: "#121214", hairStyle: "braids",
    clothingColor: "#eab308", clothingStyle: "robe",
    bgColorStart: "#880e4f", bgColorEnd: "#2a0210",
    accessory: "royal-crown", facialHair: "none",
  },
  sunny: {
    skinColor: "#fdf3e7", hairColor: "#f59e0b", hairStyle: "curly",
    clothingColor: "#3b82f6", clothingStyle: "modern",
    bgColorStart: "#004d40", bgColorEnd: "#001a14",
    accessory: "none", facialHair: "none",
  },
};

// ─── Sub-renderers (ported from CharacterAvatar.tsx) ─────────────────────────

function HairBack({ style, color }: { style: string; color: string }) {
  if (style === "long") return <path d="M55,80 C35,110 35,160 45,170 C55,180 80,180 90,150 Z" fill={color} />;
  if (style === "curly") return (
    <>
      <circle cx="65" cy="75" r="22" fill={color} />
      <circle cx="135" cy="75" r="22" fill={color} />
      <circle cx="55" cy="110" r="18" fill={color} />
      <circle cx="145" cy="110" r="18" fill={color} />
    </>
  );
  if (style === "wild") return <path d="M40,60 C25,35 15,90 20,132 C35,130 50,110 50,90 Z" fill={color} opacity="0.9" />;
  if (style === "braids") return (
    <>
      <path d="M56,80 L48,155 L60,165 Z" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      <path d="M144,80 L152,155 L140,165 Z" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
    </>
  );
  return null;
}

function HairFront({ style, color }: { style: string; color: string }) {
  if (style === "classic") return <path d="M60,65 C60,40 140,40 140,65 C140,75 125,52 100,52 C75,52 60,75 60,65 Z" fill={color} />;
  if (style === "wild") return (
    <>
      <path d="M100,25 C50,15 40,65 50,85 C70,75 130,75 150,85 C160,65 150,15 100,25 Z" fill={color} />
      <path d="M65,55 Q50,30 35,45" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M135,55 Q150,30 165,45" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </>
  );
  if (style === "curly") return (
    <>
      <circle cx="80" cy="55" r="16" fill={color} />
      <circle cx="100" cy="50" r="18" fill={color} />
      <circle cx="120" cy="55" r="16" fill={color} />
      <circle cx="70" cy="70" r="14" fill={color} />
      <circle cx="130" cy="70" r="14" fill={color} />
    </>
  );
  if (style === "bob") return <path d="M60,60 C60,40 140,40 140,60 C140,85 142,120 138,135 C115,100 85,100 62,135 C58,120 60,85 60,60 Z" fill={color} />;
  if (style === "short") return <path d="M62,68 C62,45 138,45 138,68 C138,71 125,58 100,58 C75,58 62,71 62,68 Z" fill={color} />;
  if (style === "bald") return <ellipse cx="100" cy="58" rx="25" ry="8" fill="#ffffff" opacity="0.15" />;
  if (style === "braids") return (
    <>
      <path d="M60,65 C60,40 140,40 140,65 C140,75 125,52 100,52 C75,52 60,75 60,65 Z" fill={color} />
      <path d="M56,80 L48,180" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <path d="M144,80 L152,180" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
    </>
  );
  return <path d="M62,62 C62,40 138,40 138,62 Z" fill={color} />;
}

function Clothing({ style, color }: { style: string; color: string }) {
  if (style === "toga") return (
    <g>
      <path d="M40,150 Q100,140 160,150 L175,220 L25,220 Z" fill="#ffffff" />
      <path d="M40,150 Q80,180 120,210 L150,220 L110,220 Q70,190 35,160 Z" fill={color} opacity="0.9" />
    </g>
  );
  if (style === "suit") return (
    <g>
      <path d="M40,148 L160,148 L175,220 L25,220 Z" fill={color} />
      <path d="M85,148 L115,148 L100,180 Z" fill="#ffffff" />
      <path d="M97,156 L103,156 L105,190 L100,195 L95,190 Z" fill="#ca1f1f" />
      <path d="M40,148 L75,175 L80,148" fill="none" stroke="#000" strokeWidth="1" opacity="0.3" />
      <path d="M160,148 L125,175 L120,148" fill="none" stroke="#000" strokeWidth="1" opacity="0.3" />
    </g>
  );
  if (style === "academic") return (
    <g>
      <path d="M40,148 Q100,138 160,148 L175,220 L25,220 Z" fill="#1e1b4b" />
      <path d="M48,150 C52,175 75,205 100,205 C125,205 148,175 152,150" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M90,148 L110,148 L100,165 Z" fill="#fef08a" />
    </g>
  );
  if (style === "labcoat") return (
    <g>
      <path d="M40,148 L160,148 L170,220 L30,220 Z" fill="#3b82f6" />
      <path d="M40,148 L80,152 L85,220 L25,220 Z" fill="#f8fafc" />
      <path d="M160,148 L120,152 L115,220 L175,220 Z" fill="#f8fafc" />
      <circle cx="82" cy="180" r="2" fill="#94a3b8" />
      <circle cx="84" cy="205" r="2" fill="#94a3b8" />
    </g>
  );
  if (style === "armor") return (
    <g>
      <path d="M40,150 Q100,135 160,150 L175,220 L25,220 Z" fill="#64748b" />
      <path d="M75,150 C75,150 78,138 100,138 C122,138 125,150 125,150 Z" fill="#475569" />
      <path d="M70,168 L100,150 L130,168" fill="none" stroke="#eab308" strokeWidth="2.5" opacity="0.8" />
    </g>
  );
  if (style === "modern") return (
    <g>
      <path d="M40,148 L160,148 L170,220 L30,220 Z" fill={color} />
      <path d="M85,148 L100,172 L115,148" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    </g>
  );
  // robe (default)
  return (
    <g>
      <path d="M40,148 Q100,135 160,148 L175,220 L25,220 Z" fill={color} />
      <path d="M70,148 Q100,162 130,148" fill="none" stroke="#eab308" strokeWidth="1.8" opacity="0.65" strokeDasharray="3 1" />
    </g>
  );
}

function Eyes({ hairColor, blink }: { hairColor: string; blink: boolean }) {
  return (
    <g>
      <ellipse cx="86" cy="94" rx="5" ry="3.5" fill="#ffffff" />
      <ellipse cx="86.5" cy="94" rx="2.5" ry="2.5" fill={hairColor} />
      <circle cx="87.5" cy="93" r="0.8" fill="#ffffff" />
      <ellipse cx="114" cy="94" rx="5" ry="3.5" fill="#ffffff" />
      <ellipse cx="113.5" cy="94" rx="2.5" ry="2.5" fill={hairColor} />
      <circle cx="114.5" cy="93" r="0.8" fill="#ffffff" />
      <path d="M79,88 Q86,85 91,88" fill="none" stroke={hairColor} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M109,88 Q114,85 121,88" fill="none" stroke={hairColor} strokeWidth="1.5" strokeLinecap="round" />
      {blink && (
        <>
          <ellipse cx="86" cy="94" rx="6" ry="4" fill="#edd6b1" />
          <line x1="80" y1="94" x2="92" y2="94" stroke="#8b7454" strokeWidth="1.2" />
          <ellipse cx="114" cy="94" rx="6" ry="4" fill="#edd6b1" />
          <line x1="108" y1="94" x2="120" y2="94" stroke="#8b7454" strokeWidth="1.2" />
        </>
      )}
    </g>
  );
}

function FacialHair({ type, color }: { type: string; color: string }) {
  if (type === "mustache") return <path d="M74,124 C74,124 84,115 100,118 C116,115 126,124 126,124 Q100,132 74,124 Z" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />;
  if (type === "full-beard") return <path d="M64,110 Q100,158 136,110 Q100,140 64,110 Z" fill={color} />;
  if (type === "white-beard") return <path d="M64,112 Q100,175 136,112 Q100,140 64,112 Z" fill="#f1f5f9" />;
  if (type === "goatee") return <path d="M94,128 L106,128 L100,142 Z" fill={color} />;
  if (type === "stubble") return <ellipse cx="100" cy="128" rx="18" ry="8" fill={color} opacity="0.25" />;
  return null;
}

function Accessory({ type, color }: { type: string; color: string }) {
  if (type === "glasses") return (
    <g>
      <rect x="74" y="88" width="22" height="13" rx="3" fill="none" stroke="#222" strokeWidth="2" />
      <rect x="104" y="88" width="22" height="13" rx="3" fill="none" stroke="#222" strokeWidth="2" />
      <line x1="96" y1="94" x2="104" y2="94" stroke="#222" strokeWidth="2" />
    </g>
  );
  if (type === "glasses-gold") return (
    <g>
      <circle cx="85" cy="94" r="9" fill="none" stroke="#eab308" strokeWidth="1.5" />
      <circle cx="115" cy="94" r="9" fill="none" stroke="#eab308" strokeWidth="1.5" />
      <line x1="94" y1="94" x2="106" y2="94" stroke="#eab308" strokeWidth="1.5" />
    </g>
  );
  if (type === "monocle") return (
    <g>
      <circle cx="85" cy="94" r="10" fill="none" stroke="#d4af37" strokeWidth="1.8" />
      <path d="M95,94 Q115,108 115,150" fill="none" stroke="#d4af37" strokeWidth="0.8" strokeDasharray="1 1" />
    </g>
  );
  if (type === "laurel-wreath") return (
    <g opacity="0.85">
      <path d="M68,75 Q80,55 100,55" fill="none" stroke="#15803d" strokeWidth="2.5" />
      <circle cx="75" cy="65" r="2" fill="#22c55e" />
      <circle cx="85" cy="58" r="2.5" fill="#22c55e" />
      <path d="M132,75 Q120,55 100,55" fill="none" stroke="#15803d" strokeWidth="2.5" />
      <circle cx="125" cy="65" r="2" fill="#22c55e" />
      <circle cx="115" cy="58" r="2.5" fill="#22c55e" />
    </g>
  );
  if (type === "royal-crown") return (
    <g transform="translate(100, 48)">
      <path d="M-36,0 L36,0 L32,10 L-32,10 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
      <path d="M-32,0 L-28,-18 L-14,-6 L0,-24 L14,-6 L28,-18 L32,0" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      <circle cx="0" cy="5" r="2" fill="#ef4444" />
      <circle cx="-16" cy="5" r="1.8" fill="#3b82f6" />
      <circle cx="16" cy="5" r="1.8" fill="#3b82f6" />
    </g>
  );
  if (type === "scientist-goggles") return (
    <g>
      <rect x="72" y="85" width="25" height="18" rx="4" fill="none" stroke="#475569" strokeWidth="3" />
      <rect x="103" y="85" width="25" height="18" rx="4" fill="none" stroke="#475569" strokeWidth="3" />
      <line x1="97" y1="94" x2="103" y2="94" stroke="#475569" strokeWidth="3" />
    </g>
  );
  if (type === "earrings") return (
    <g>
      <circle cx="58" cy="106" r="3" fill="none" stroke="#eab308" strokeWidth="1.5" />
      <circle cx="142" cy="106" r="3" fill="none" stroke="#eab308" strokeWidth="1.5" />
    </g>
  );
  return null;
}

function Mouth({ mouthOffset, isSpeaking }: { mouthOffset: number; isSpeaking: boolean }) {
  if (isSpeaking) {
    return (
      <ellipse
        cx="100" cy="123"
        rx="8"
        ry={3 + mouthOffset * 0.55}
        fill="#521b1b"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="1.5"
      />
    );
  }
  return <path d="M91,123 Q100,126 109,123" stroke="rgba(0,0,0,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />;
}

// ─── Einstein special SVG (matches Luminary exactly) ─────────────────────────

function EinsteinSvg({ blink, isSpeaking, mouthOffset }: { blink: boolean; isSpeaking: boolean; mouthOffset: number }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="albert-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e2d24" />
          <stop offset="100%" stopColor="#131d17" />
        </linearGradient>
        <linearGradient id="albert-skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe9dc" />
          <stop offset="100%" stopColor="#edcbb7" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#albert-bg)" />
      <text x="15" y="30" fill="rgba(255,255,255,0.06)" fontSize="8" fontFamily="monospace">E = mc²</text>
      <text x="140" y="45" fill="rgba(255,255,255,0.05)" fontSize="7" fontFamily="monospace">G_μν = R_μν</text>
      <g transform="translate(0, 10)">
        <path d="M48,60 C25,35 15,90 20,132 C35,130 50,110 50,90 Z" fill="#e9eff5" opacity="0.9" />
        <path d="M152,60 C175,35 185,90 180,132 C165,130 150,110 150,90 Z" fill="#e9eff5" opacity="0.9" />
        <path d="M100,25 C50,15 40,65 50,85 C70,75 130,75 150,85 C160,65 150,15 100,25 Z" fill="#e9eff5" />
        <path d="M50,148 L150,148 L165,220 L35,220 Z" fill="#2d3748" />
        <path d="M50,148 Q100,175 150,148" fill="#1a202c" />
        <path d="M85,152 Q100,165 115,152 L110,170 Q100,178 90,170 Z" fill="#cbd5e0" />
        <path d="M62,85 C62,55 138,55 138,85 C138,115 132,150 100,150 C68,150 62,115 62,85 Z" fill="url(#albert-skin)" />
        <circle cx="85" cy="98" r="7" fill="#fff" />
        <circle cx="85" cy="98" r="3.5" fill="#4a5568" />
        <circle cx="83.5" cy="96" r="1" fill="#fff" />
        <circle cx="115" cy="98" r="7" fill="#fff" />
        <circle cx="115" cy="98" r="3.5" fill="#4a5568" />
        <circle cx="113.5" cy="96" r="1" fill="#fff" />
        {blink && (
          <>
            <ellipse cx="85" cy="98" rx="8" ry="7" fill="#edd6b1" />
            <path d="M77,98 L93,98" stroke="#8b7454" strokeWidth="1.5" />
            <ellipse cx="115" cy="98" rx="8" ry="7" fill="#edd6b1" />
            <path d="M107,98 L123,98" stroke="#8b7454" strokeWidth="1.5" />
          </>
        )}
        <path d="M73,90 C83,82 92,92 92,92" fill="none" stroke="#f7fafc" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M127,90 C117,82 108,92 108,92" fill="none" stroke="#f7fafc" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M96,100 L104,100 L103,116 Q100,121 97,116 Z" fill="#ebbea3" />
        <path d="M68,127 C68,127 80,118 100,121 C120,118 132,127 132,127 C132,127 122,138 100,135 C78,138 68,127 68,127 Z" fill="#edf2f7" />
        {isSpeaking ? (
          <ellipse cx="100" cy="138" rx="9" ry={3 + mouthOffset * 0.6} fill="#522f28" stroke="#ebbea3" strokeWidth="1.5" />
        ) : (
          <path d="M93,135 Q100,140 107,135" stroke="#a1665a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        <path d="M65,55 Q50,30 35,45" fill="none" stroke="#edf2f7" strokeWidth="4" strokeLinecap="round" />
        <path d="M135,55 Q150,30 165,45" fill="none" stroke="#edf2f7" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Generic custom character SVG ────────────────────────────────────────────

function CustomSvg({
  id,
  name,
  style,
  blink,
  isSpeaking,
  mouthOffset,
}: {
  id: string;
  name: string;
  style: SvgStyle;
  blink: boolean;
  isSpeaking: boolean;
  mouthOffset: number;
}) {
  const safeId = id.replace(/[^a-zA-Z0-9]/g, "-");
  const gradId = `grad-${safeId}`;
  const skinGradId = `skin-${safeId}`;
  const glowId = `glow-${safeId}`;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={style.bgColorStart} />
          <stop offset="100%" stopColor={style.bgColorEnd} />
        </linearGradient>
        <linearGradient id={skinGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.1} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={style.hairColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="200" height="200" fill={`url(#${gradId})`} />
      <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="100" cy="100" r="55" fill={`url(#${glowId})`} />

      <HairBack style={style.hairStyle} color={style.hairColor} />
      <Clothing style={style.clothingStyle} color={style.clothingColor} />

      {/* Ear stubs */}
      <ellipse cx="61" cy="98" rx="5" ry="8" fill={style.skinColor} />
      <ellipse cx="139" cy="98" rx="5" ry="8" fill={style.skinColor} />

      {/* Face */}
      <path d="M64,85 C64,55 136,55 136,85 C136,115 130,146 100,146 C70,146 64,115 64,85 Z" fill={style.skinColor} />
      <path d="M64,85 C64,55 136,55 136,85 C136,115 130,146 100,146 C70,146 64,115 64,85 Z" fill={`url(#${skinGradId})`} />

      <HairFront style={style.hairStyle} color={style.hairColor} />
      <Eyes hairColor={style.hairColor} blink={blink} />

      {/* Nose */}
      <path d="M97,93 Q100,105 100,111 Q100,113 97,113 T103,113 C103,113 103,110 102,105" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeLinecap="round" />

      <FacialHair type={style.facialHair} color={style.hairColor} />
      <Mouth mouthOffset={mouthOffset} isSpeaking={isSpeaking} />
      <Accessory type={style.accessory} color={style.hairColor} />

      {/* Initial badge */}
      <g transform="translate(100, 32)">
        <circle cx="0" cy="0" r="10" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace" opacity="0.85">
          {name.charAt(0).toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CharacterSvgAvatar({
  personalityId,
  personalityName = "AI",
  isSpeaking,
  intensity = 0.5,
}: CharacterSvgAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [mouthOffset, setMouthOffset] = useState(0);

  // Biological blinking — random 4s–6s interval, 150ms blink window
  useEffect(() => {
    const schedule = () => {
      const delay = 4000 + Math.random() * 2000;
      return setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        timeoutRef.current = schedule();
      }, delay);
    };
    const timeoutRef = { current: schedule() };
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Lip-sync — 120ms oscillation proportional to speech intensity
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOffset(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthOffset(Math.random() * 8 * intensity);
    }, 120);
    return () => clearInterval(interval);
  }, [isSpeaking, intensity]);

  const style = PERSONALITY_STYLES[personalityId];

  return (
    <div className="relative w-full h-full select-none">
      {/* SVG Portrait */}
      {personalityId === "einstein" ? (
        <EinsteinSvg blink={blink} isSpeaking={isSpeaking} mouthOffset={mouthOffset} />
      ) : style ? (
        <CustomSvg
          id={personalityId}
          name={personalityName}
          style={style}
          blink={blink}
          isSpeaking={isSpeaking}
          mouthOffset={mouthOffset}
        />
      ) : (
        // Fallback initial bubble for unknown personalities
        <div className="w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-pastel-lilac to-pastel-mint">
          <span className="text-5xl font-bold text-pastel-ink">
            {personalityName.charAt(0)}
          </span>
        </div>
      )}

      {/* Speaking waveform badge */}
      {isSpeaking && (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 bg-black/60 backdrop-blur-md py-1 px-3 rounded-full border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-pastel-lilac animate-ping flex-shrink-0" />
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 rounded-full"
                style={{ backgroundColor: "#C4B5FD" }}
                animate={{ height: [4, 12, 4] }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.08,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
