'use client';

import { useState } from 'react';
import { hasAudio, playMedia } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText, Media } from '@/lib/types';

export function ListenButton({ media, big = false, autoLabel }: { media: Media; big?: boolean; autoLabel?: string }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  if (!hasAudio(media)) {
    return <span className="chip bg-amber-50 text-amber-800">{t('common.noAudio')}</span>;
  }
  return (
    <button
      type="button"
      aria-label={autoLabel ?? t('common.listen')}
      className={`${big ? 'h-20 w-20 text-4xl' : 'h-12 w-12 text-2xl'} inline-flex items-center justify-center rounded-full bg-sun-400 shadow-pop transition active:translate-y-[2px] active:shadow-none ${playing ? 'animate-pulse' : ''}`}
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await playMedia(media);
        setPlaying(false);
      }}
    >
      🔊
    </button>
  );
}

/** Renders whatever the media carries: picture, text, IPA, caption, and a listen button. */
export function MediaView({ media, size = 'lg', listen = true }: { media: Media; size?: 'sm' | 'lg' | 'xl'; listen?: boolean }) {
  const { pick } = useI18n();
  const text = size === 'xl' ? 'text-7xl sm:text-8xl' : size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl';
  const pic = size === 'xl' ? 'text-8xl' : size === 'lg' ? 'text-6xl' : 'text-4xl';
  const caption = media.caption ? pick(media.caption as LocalizedText) : '';
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
        <span lang="en" className={`${text} font-extrabold tracking-wide text-slate-900`}>
          {media.text}
        </span>
      )}
      {media.ipa && <span className="font-mono text-lg text-slate-500">{media.ipa}</span>}
      {media.sequence && (
        <div className="flex gap-2" lang="en">
          {media.sequence.map((s, i) => (
            <span key={i} className="rounded-xl bg-brand-50 px-3 py-1 text-2xl font-bold text-brand-700">
              {s.text ?? s.ipa ?? '•'}
            </span>
          ))}
        </div>
      )}
      {caption && <span className="max-w-md text-sm text-slate-600">{caption}</span>}
      {listen && (hasAudio(media) || media.ipa) && <ListenButton media={media} big={size === 'xl'} />}
    </div>
  );
}
