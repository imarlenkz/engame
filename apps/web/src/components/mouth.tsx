'use client';

import { useId } from 'react';

/**
 * Front view of the mouth for each of the 44 sounds, drawn from the sound's IPA.
 * Used wherever a phoneme has no uploaded mouth picture (Phoneme.mouthImage), so every sound always shows one.
 */
type Shape = 'closed' | 'spread' | 'open' | 'round' | 'smallRound' | 'forward' | 'relaxed' | 'teethLip' | 'tongueOut' | 'tipUp' | 'back';

const SHAPES: Record<string, Shape[]> = {
  p: ['closed'], b: ['closed'], m: ['closed'],
  f: ['teethLip'], v: ['teethLip'],
  θ: ['tongueOut'], ð: ['tongueOut'],
  t: ['tipUp'], d: ['tipUp'], n: ['tipUp'], l: ['tipUp'], s: ['tipUp'], z: ['tipUp'],
  ʃ: ['forward'], ʒ: ['forward'], tʃ: ['forward'], dʒ: ['forward'], r: ['forward'],
  k: ['back'], ɡ: ['back'], g: ['back'], ŋ: ['back'], h: ['open'],
  w: ['smallRound'], j: ['spread'],
  æ: ['open'], e: ['spread'], ɪ: ['spread'], ɒ: ['round'], ʌ: ['relaxed'], ʊ: ['round'], ə: ['relaxed'],
  iː: ['spread'], uː: ['smallRound'], ɔː: ['round'], ɑː: ['open'], ɜː: ['relaxed'],
  eɪ: ['relaxed', 'spread'], aɪ: ['open', 'spread'], ɔɪ: ['round', 'spread'], əʊ: ['relaxed', 'smallRound'], aʊ: ['open', 'smallRound'],
  ɪə: ['spread', 'relaxed'], eə: ['spread', 'relaxed'], ʊə: ['round', 'relaxed'],
};

/** Opening of the lips (half-width, half-height) and what is visible inside. */
const GEOMETRY: Record<Shape, { rx: number; ry: number; top: boolean; bottom: boolean; tongue: 'low' | 'mid' | 'out' | 'up' | 'back' | 'none' }> = {
  closed: { rx: 56, ry: 0, top: false, bottom: false, tongue: 'none' },
  spread: { rx: 62, ry: 12, top: true, bottom: true, tongue: 'mid' },
  open: { rx: 50, ry: 32, top: true, bottom: false, tongue: 'low' },
  round: { rx: 30, ry: 26, top: true, bottom: false, tongue: 'low' },
  smallRound: { rx: 17, ry: 15, top: false, bottom: false, tongue: 'none' },
  forward: { rx: 36, ry: 14, top: true, bottom: true, tongue: 'none' },
  relaxed: { rx: 46, ry: 16, top: true, bottom: false, tongue: 'mid' },
  teethLip: { rx: 54, ry: 8, top: false, bottom: false, tongue: 'none' },
  tongueOut: { rx: 54, ry: 14, top: true, bottom: true, tongue: 'out' },
  tipUp: { rx: 52, ry: 11, top: true, bottom: true, tongue: 'up' },
  back: { rx: 44, ry: 20, top: true, bottom: true, tongue: 'back' },
};

const LIP = '#fb8371';
const LIP_DARK = '#d9604f';
const CAVITY = '#2a0f22';
const TEETH = '#ffffff';
const TONGUE = '#ff9fb6';

function Mouth({ shape, x }: { shape: Shape; x: number }) {
  const id = useId().replace(/:/g, '');
  const g = GEOMETRY[shape];
  const cy = 60;
  const lip = 13;
  if (shape === 'closed') {
    return (
      <g transform={`translate(${x} 0)`}>
        <path d={`M ${-g.rx - 8} ${cy} Q 0 ${cy - 34} ${g.rx + 8} ${cy} Z`} fill={LIP} />
        <path d={`M ${-g.rx - 8} ${cy} Q 0 ${cy + 34} ${g.rx + 8} ${cy} Z`} fill={LIP_DARK} />
        <path d={`M ${-g.rx - 8} ${cy} Q 0 ${cy + 4} ${g.rx + 8} ${cy}`} stroke={CAVITY} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  const clip = `m-${id}-${shape}`;
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx={0} cy={cy} rx={g.rx + lip} ry={g.ry + lip} fill={LIP} />
      <ellipse cx={0} cy={cy + (g.ry + lip) * 0.45} rx={(g.rx + lip) * 0.86} ry={(g.ry + lip) * 0.55} fill={LIP_DARK} opacity="0.55" />
      <clipPath id={clip}>
        <ellipse cx={0} cy={cy} rx={g.rx} ry={g.ry} />
      </clipPath>
      <ellipse cx={0} cy={cy} rx={g.rx} ry={g.ry} fill={CAVITY} />
      <g clipPath={`url(#${clip})`}>
        {g.tongue === 'low' && <ellipse cx={0} cy={cy + g.ry * 0.95} rx={g.rx * 0.75} ry={g.ry * 0.5} fill={TONGUE} />}
        {g.tongue === 'mid' && <ellipse cx={0} cy={cy + g.ry * 0.8} rx={g.rx * 0.7} ry={g.ry * 0.6} fill={TONGUE} />}
        {g.tongue === 'back' && <ellipse cx={0} cy={cy + g.ry * 0.35} rx={g.rx * 0.8} ry={g.ry * 0.75} fill={TONGUE} opacity="0.9" />}
        {g.tongue === 'up' && <path d={`M ${-g.rx * 0.6} ${cy + g.ry} Q 0 ${cy - g.ry * 1.3} ${g.rx * 0.6} ${cy + g.ry} Z`} fill={TONGUE} />}
        {g.top && <rect x={-g.rx} y={cy - g.ry - 1} width={g.rx * 2} height={Math.max(6, Math.min(10, g.ry * 0.75))} fill={TEETH} rx="2" />}
        {g.bottom && <rect x={-g.rx} y={cy + g.ry - Math.max(5, Math.min(8, g.ry * 0.6)) + 1} width={g.rx * 2} height={Math.max(5, Math.min(8, g.ry * 0.6))} fill={TEETH} rx="2" />}
      </g>
      {shape === 'teethLip' && (
        <>
          {/* top teeth resting on the bottom lip */}
          <rect x={-g.rx * 0.62} y={cy - g.ry - 1} width={g.rx * 1.24} height={g.ry * 2 + 7} fill={TEETH} rx="3" />
        </>
      )}
      {g.tongue === 'out' && <ellipse cx={0} cy={cy + 1} rx={g.rx * 0.45} ry={7} fill={TONGUE} stroke={LIP_DARK} strokeWidth="1" />}
    </g>
  );
}

export function MouthShape({ ipa, className = '' }: { ipa: string; className?: string }) {
  const key = ipa.replace(/\//g, '').trim();
  const shapes = SHAPES[key] ?? ['relaxed'];
  const two = shapes.length > 1;
  const width = two ? 340 : 160;
  return (
    <svg viewBox={`0 0 ${width} 120`} className={className} role="img" aria-label={`/${key}/`}>
      {two ? (
        <>
          <Mouth shape={shapes[0]!} x={80} />
          <path d="M 152 60 L 186 60 M 176 50 L 188 60 L 176 70" stroke="#cfd6ff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Mouth shape={shapes[1]!} x={260} />
        </>
      ) : (
        <Mouth shape={shapes[0]!} x={80} />
      )}
    </svg>
  );
}
