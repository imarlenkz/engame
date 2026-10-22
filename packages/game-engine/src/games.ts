import type { ContentIndex, PlannedExercise, Rng } from '@engame/phonics-engine';

/**
 * A game turns a content pool into one exercise of its type. Games are rows in the `games` table
 * (type + config), so admins add or tune games without code; a new *kind* of pool is a new case here.
 */
export type Pool = 'phonemes' | 'letters' | 'words' | 'cvc_words' | 'digraph_words' | 'sight_words';

export interface GameConfig {
  pool: Pool;
  items: number;
  options?: number;
  extraTiles?: number;
  /** Optional explicit content (phoneme slugs, letters or words) instead of a pool. */
  only?: string[];
}

export function parseGameConfig(raw: unknown): GameConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const pools: Pool[] = ['phonemes', 'letters', 'words', 'cvc_words', 'digraph_words', 'sight_words'];
  const pool = pools.includes(c.pool as Pool) ? (c.pool as Pool) : 'words';
  const items = typeof c.items === 'number' ? Math.min(30, Math.max(1, Math.round(c.items))) : 8;
  return {
    pool,
    items,
    options: typeof c.options === 'number' ? c.options : undefined,
    extraTiles: typeof c.extraTiles === 'number' ? c.extraTiles : undefined,
    only: Array.isArray(c.only) ? c.only.filter((x): x is string => typeof x === 'string') : undefined,
  };
}

function poolKeys(content: ContentIndex, pool: Pool): string[] {
  const words = [...content.words.values()].filter((w) => w.emoji || w.imageUrl);
  switch (pool) {
    case 'phonemes':
      return [...content.phonemes.keys()];
    case 'letters':
      return [...content.letters.keys()];
    case 'words':
      return words.map((w) => w.text);
    case 'cvc_words':
      return words.filter((w) => w.pattern === 'CVC').map((w) => w.text);
    case 'digraph_words':
      return words.filter((w) => w.pattern === 'DIGRAPH').map((w) => w.text);
    case 'sight_words':
      return [...content.words.values()].filter((w) => w.isSightWord).map((w) => w.text);
  }
}

/**
 * Picks items for a game, favouring the child's weak items (they are listed first and always included when they
 * belong to the pool), then filling with random pool items.
 */
export function planGame(
  game: { id: string; type: string; config: unknown },
  content: ContentIndex,
  rng: Rng,
  focus: string[] = [],
): PlannedExercise {
  const config = parseGameConfig(game.config);
  const pool = (config.only?.length ? config.only : poolKeys(content, config.pool)).sort();
  const n = game.type === 'memory' ? Math.min(config.items, 8) : config.items;
  const preferred = focus.filter((k) => pool.includes(k)).slice(0, Math.ceil(n / 2));
  const rest = rng.sample(
    pool.filter((k) => !preferred.includes(k)),
    n - preferred.length,
  );
  const picked = rng.shuffle([...preferred, ...rest]);
  const options = config.options ?? 3;

  const configFor = (): unknown => {
    switch (game.type) {
      case 'sound_to_letter':
      case 'letter_to_sound':
        return { phonemes: picked, options };
      case 'letter_match':
        return { letters: picked, direction: 'upper_to_lower', options };
      case 'letter_recognition':
        return { letters: picked, options };
      case 'memory':
        return config.pool === 'letters' ? { mode: 'letters', letters: picked } : { mode: 'words', words: picked };
      case 'word_builder':
        return { words: picked, tiles: 'letters', extraTiles: config.extraTiles ?? 1 };
      case 'segment':
        return { words: picked };
      default:
        // listen_choose, blend, missing_letter, read_word, sight_word all take words + options
        return { words: picked, options };
    }
  };
  return { id: `game-${game.id}`, type: game.type, config: configFor() };
}
