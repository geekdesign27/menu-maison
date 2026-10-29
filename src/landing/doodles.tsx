// Hand-drawn marks of the landing page: drawn with a round pen, like notes on
// a shopping list. Decorative only (aria-hidden).
import type { CSSProperties } from "react";

interface DoodleProps {
  className?: string;
  style?: CSSProperties;
}

const pen = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The wobbly line under a word that matters. */
export function Squiggle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 240 22" preserveAspectRatio="none" className={className} style={style} aria-hidden>
      <path {...pen} strokeWidth="6" d="M4 15C38 6 74 5 112 10C150 15 186 17 236 6" />
    </svg>
  );
}

/** A curved arrow, pointing right then down. */
export function CurlyArrow({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 90 70" className={className} style={style} aria-hidden>
      <path {...pen} strokeWidth="3.2" d="M6 10C30 2 62 6 70 26C76 40 66 52 56 58" />
      <path {...pen} strokeWidth="3.2" d="M50 46L55 59L68 56" />
    </svg>
  );
}

export function Star({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      <path
        {...pen}
        strokeWidth="2.8"
        d="M20 4L24.2 15.2L36 15.8L26.8 23.2L30 34.6L20 28L10.2 34.8L13.4 23.4L4 16L15.8 15.4Z"
      />
    </svg>
  );
}

/** Four little strokes around something that just happened. */
export function Burst({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      <path {...pen} strokeWidth="3" d="M20 3V11M33 9L28 15M37 23H29M7 9L12 15" />
    </svg>
  );
}

export function Carrot({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <path d="M14 52C10 48 22 30 34 22C40 18 46 22 44 28C40 40 20 56 14 52Z" fill="#e97537" />
      <path {...pen} stroke="#9e3f12" strokeWidth="2" d="M25 36L30 38M21 43L26 45M31 28L35 31" />
      <path {...pen} stroke="#2f8a57" strokeWidth="3.4" d="M41 21C43 14 48 10 54 9M42 22C49 20 54 22 57 26M40 20C38 14 40 8 44 5" />
    </svg>
  );
}

export function Pot({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <path {...pen} strokeWidth="3" d="M24 14C22 10 26 8 24 4M33 14C31 10 35 8 33 4M42 14C40 10 44 8 42 4" opacity="0.6" />
      <path {...pen} strokeWidth="3.2" d="M12 24H52M14 24V46C14 52 18 56 24 56H40C46 56 50 52 50 46V24M14 30H6M50 30H58" />
    </svg>
  );
}

/** A small shopping list on a notepad. */
export function ListPad({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <rect {...pen} strokeWidth="3" x="12" y="8" width="40" height="50" rx="6" />
      <path {...pen} strokeWidth="3" d="M20 22L23 25L28 19M34 22H44M20 34L23 37L28 31M34 34H44M21 46H28M34 46H44" />
    </svg>
  );
}

/** A chef's hat, worn above the logo: the official mark itself stays untouched. */
export function Toque({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 80 52" className={className} style={style} aria-hidden>
      <path
        d="M18 40C8 40 4 30 8 23C12 16 20 15 24 18C25 9 33 4 40 4C47 4 55 9 56 18C60 15 68 16 72 23C76 30 72 40 62 40Z"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="18" y="38" width="44" height="11" rx="3" fill="#ffffff" stroke="currentColor" strokeWidth="3" />
      <path {...pen} strokeWidth="2.4" d="M30 30V38M40 28V38M50 30V38" opacity="0.5" />
    </svg>
  );
}

