/** Pastel minimal design tokens for Luminary */
export const pastel = {
  cream: "#FFF9F5",
  blush: "#FFE8EE",
  mint: "#DFF5EC",
  sky: "#E4EEFF",
  lilac: "#EDE4FF",
  lemon: "#FFF6D6",
  peach: "#FFE5D4",
  ink: "#4A4458",
  inkMuted: "#8B839E",
  inkLight: "#B5AFC0",
  white: "#FFFFFF",
} as const;

export const topicPastels: Record<string, { bg: string; text: string }> = {
  physics: { bg: pastel.sky, text: "#6B8FD4" },
  math: { bg: pastel.lilac, text: "#9B7FD4" },
  history: { bg: pastel.peach, text: "#D4926A" },
  literature: { bg: pastel.blush, text: "#D47A9A" },
  chemistry: { bg: pastel.mint, text: "#5BA888" },
  biology: { bg: pastel.mint, text: "#5BA888" },
  engineering: { bg: pastel.lemon, text: "#C4A832" },
  philosophy: { bg: pastel.lilac, text: "#9B7FD4" },
};
