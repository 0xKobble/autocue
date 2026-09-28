import { useEffect, useRef } from "react";
import { STEM_COLORS_A, STEM_COLORS_B, STEM_NAMES } from "../audio/waveform";
import type { DeckId, StemGains } from "../types/models";

interface Props {
  deckId: DeckId;
  peaks: number[][];
  stems: StemGains;
  position: number;
  playing: boolean;
}

export function Waveform({ deckId, peaks, stems, position, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0) return;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = cssW;
    const h = cssH;
    const mid = h / 2;
    const colors = deckId === "A" ? STEM_COLORS_A : STEM_COLORS_B;
    const bars = peaks[0]?.length ?? 0;
    const gap = 1.5;
    const barW = bars ? (w - gap * bars) / bars : 0;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0C0C0E";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    for (let L = STEM_NAMES.length - 1; L >= 0; L--) {
      const name = STEM_NAMES[L];
      const gain = stems[name];
      if (gain < 0.02) continue;
      const layer = peaks[L];
      if (!layer) continue;
      const alpha = 0.35 + gain * 0.65;
      ctx.fillStyle = colors[name].replace(/[\d.]+\)$/, `${alpha})`);

      for (let i = 0; i < bars; i++) {
        const amp = layer[i] * gain * (0.55 + L * 0.08);
        const bh = amp * (h * 0.42);
        const x = i * (barW + gap);
        const y = mid - bh;
        ctx.fillRect(x, y, Math.max(1, barW), bh * 2);
      }
    }

    if (playing) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      const accent = deckId === "A" ? "184,255,60" : "123,92,255";
      grad.addColorStop(0, "transparent");
      grad.addColorStop(position, `rgba(${accent},0.12)`);
      grad.addColorStop(Math.min(1, position + 0.08), "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }, [deckId, peaks, stems, position, playing]);

  return (
    <div className="waveform-wrap">
      <canvas
        ref={canvasRef}
        className="waveform"
        aria-label={`Deck ${deckId} waveform`}
      />
      <div className="playhead" style={{ left: `${position * 100}%` }} />
    </div>
  );
}
