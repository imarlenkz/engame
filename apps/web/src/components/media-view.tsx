'use client';

import { useState } from 'react';
import { hasAudio, playMedia } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText, Media } from '@/lib/types';

export function ListenButton({ media, big = false, autoLabel }: { media: Media; big?: boolean; autoLabel?: string }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  if (!hasAudio(media)) {
    return <span className="chip">{t('common.noAudio')}</span>;
  }
  return (
    <button
      type="button"
      aria-label={autoLabel ?? t('common.listen')}
      className={`${big ? 'h-[72px] w-[72px]' : 'h-12 w-12'} orb-lilac shrink-0 hover:scale-105 active:scale-95 ${playing ? 'animate-pulse' : ''}`}
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await playMedia(media);
        setPlaying(false);
      }}
    >
      <span
        aria-hidden
        className="ml-[12%] h-0 w-0 border-y-transparent border-l-night"
        style={{ borderLeftWidth: big ? 24 : 15, borderTopWidth: big ? 15 : 9, borderBottomWidth: big ? 15 : 9, borderStyle: 'solid', borderRightWidth: 0 }}
      />
    </button>
  );
}

/** Renders whatever the media carries: picture, text, IPA, caption, and a listen button. */
export function MediaView({ media, size = 'lg', listen = true }: { media: Media; size?: 'sm' | 'lg' | 'xl'; listen?: boolean }) {
  const { pick } = useI18n();
  const text = size === 'xl' ? 'text-7xl sm:text-8xl' : size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl';
  const pic = size === 'xl' ? 'text-8xl' : size === 'lg' ? 'text-6xl' : 'text-4xl';
  const caption = media.caption ? pick(media.caption as LocalizedText) : '';
  // A lone grapheme («ee», «sh») becomes a glowing star you can tap to hear (design 2d).
  if (size === 'xl' && media.text && media.text.length <= 4 && !media.imageUrl && !media.emoji && !media.sequence) {
    const canPlay = listen && (hasAudio(media) || Boolean(media.ipa));
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          lang="en"
          disabled={!canPlay}
          onClick={() => void playMedia(media)}
          aria-label={media.text}
          className="orb-lilac h-48 w-48 shadow-[0_0_0_24px_rgba(207,214,255,.08),0_0_0_48px_rgba(207,214,255,.04),0_0_90px_#cfd6ff] hover:scale-105 disabled:hover:scale-100 sm:h-[220px] sm:w-[220px]"
        >
          <span className="text-[80px] leading-none tracking-[-0.04em] sm:text-[96px]">{media.text}</span>
          {media.ipa && <span className="mt-1 font-mono text-base font-bold">{media.ipa}</span>}
        </button>
        {caption && <span className="mt-8 max-w-md font-bold text-slate-600">{caption}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {media.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.imageUrl} alt={media.text ?? ''} className={`${size === 'sm' ? 'h-16' : 'h-32'} w-auto object-contain`} />
      ) : media.emoji ? (
        <span className={pic} aria-hidden>
          {media.emoji}
        </span>
      ) : null}
      {media.text && (
        <span lang="en" className={`${text} font-black tracking-wide text-slate-900`}>
          {media.text}
        </span>
      )}
      {media.ipa && <span className="font-mono text-lg font-bold text-slate-500">{media.ipa}</span>}
      {media.sequence && (
        <div className="flex gap-2" lang="en">
          {media.sequence.map((s, i) => (
            <span key={i} className="rounded-full bg-lilac/[0.14] px-4 py-1 text-2xl font-black text-lilac ring-1 ring-lilac/30">
              {s.text ?? s.ipa ?? '•'}
            </span>
          ))}
        </div>
      )}
      {caption && <span className="max-w-md text-sm font-bold text-slate-600">{caption}</span>}
      {listen && (hasAudio(media) || media.ipa) && <ListenButton media={media} big={size === 'xl'} />}
    </div>
  );
}
