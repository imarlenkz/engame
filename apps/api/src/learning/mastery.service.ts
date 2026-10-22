import { Injectable } from '@nestjs/common';
import type { MasteryItem, Prisma } from '@engame/database';
import { applyObservation, emptyMastery, type MasteryTarget, type Observation } from '@engame/phonics-engine';
import { AnalyticsService } from '../analytics/analytics.service';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';

type Tx = Prisma.TransactionClient;

@Injectable()
export class MasteryService {
  constructor(
    private readonly content: ContentService,
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Applies one observation to every target of an item. Emits sound/word_mastered on first mastery. */
  async observe(tx: Tx, childId: string, targets: MasteryTarget[], obs: Observation, now: Date) {
    if (targets.length === 0) return;
    const ids = await this.content.ids();
    const seen = new Set<string>();
    for (const t of targets) {
      const itemId = ids[t.type].get(t.key);
      const dedupe = `${t.type}:${t.key}`;
      if (!itemId || seen.has(dedupe)) continue;
      seen.add(dedupe);
      const where = { childId_itemType_itemId: { childId, itemType: t.type as MasteryItem, itemId } };
      const row = await tx.mastery.findUnique({ where });
      const prev = row ?? { ...emptyMastery(now) };
      const next = applyObservation(
        {
          score: prev.score,
          attempts: prev.attempts,
          correct: prev.correct,
          mistakes: prev.mistakes,
          avgResponseMs: prev.avgResponseMs,
          pronunciationAvg: prev.pronunciationAvg,
          ease: prev.ease,
          intervalDays: prev.intervalDays,
          streak: prev.streak,
          dueAt: prev.dueAt,
          lastSeenAt: prev.lastSeenAt,
          masteredAt: prev.masteredAt,
        },
        obs,
        now,
      );
      await tx.mastery.upsert({
        where,
        update: next,
        create: { childId, itemType: t.type as MasteryItem, itemId, ...next },
      });
      if (!prev.masteredAt && next.masteredAt && (t.type === 'PHONEME' || t.type === 'WORD')) {
        await this.analytics.track(
          t.type === 'PHONEME' ? 'sound_mastered' : 'word_mastered',
          { childId },
          { key: t.key },
        );
      }
    }
  }

  /** Due/weak items for the review block, as engine targets. */
  async reviewTargets(
    tx: Tx | null,
    childId: string,
    limit: number,
    now = new Date(),
  ): Promise<MasteryTarget[]> {
    const db = tx ?? this.prisma;
    const rows = await db.mastery.findMany({
      where: { childId, attempts: { gt: 0 }, dueAt: { lte: now }, score: { lt: 90 } },
      orderBy: [{ score: 'asc' }, { dueAt: 'asc' }],
      take: limit,
    });
    if (rows.length === 0) return [];
    const ids = await this.content.ids();
    const reverse = {
      PHONEME: new Map([...ids.PHONEME].map(([k, v]) => [v, k])),
      WORD: new Map([...ids.WORD].map(([k, v]) => [v, k])),
      LETTER: new Map([...ids.LETTER].map(([k, v]) => [v, k])),
    };
    return rows.flatMap((r) => {
      const key = reverse[r.itemType].get(r.itemId);
      return key ? [{ type: r.itemType, key }] : [];
    });
  }
}
