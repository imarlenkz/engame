export const AVATARS: Record<string, string> = {
  fox: '🦊',
  owl: '🦉',
  bear: '🐻',
  cat: '🐱',
  rabbit: '🐰',
  panda: '🐼',
  lion: '🦁',
  penguin: '🐧',
  frog: '🐸',
  unicorn: '🦄',
};

export function Avatar({ name, size = 'text-4xl' }: { name: string; size?: string }) {
  return (
    <span className={`${size} inline-block`} aria-hidden>
      {AVATARS[name] ?? '🙂'}
    </span>
  );
}
