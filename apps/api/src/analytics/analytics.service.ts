import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { Prisma } from '@engame/database';
import { PrismaService } from '../infra/infra.module';

export const EVENT_NAMES = [
  'user_registered',
  'user_logged_in',
  'child_created',
  'placement_completed',
  'lesson_started',
  'lesson_completed',
  'exercise_started',
  'answer_correct',
  'answer_wrong',
  'sound_mastered',
  'word_mastered',
  'game_started',
  'game_completed',
  'pronunciation_attempt',
  'achievement_unlocked',
  'streak_updated',
  'daily_mission_completed',
  'offline_sync',
  'content_published',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Privacy-friendly product analytics: event name, ids, small numeric/enum props. Never IP, user agent,
 * free text or audio. Failures are logged and never break the request.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(
    name: EventName,
    ids: { userId?: string | null; childId?: string | null },
    props: Record<string, unknown> = {},
  ) {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          name,
          userId: ids.userId ?? null,
          childId: ids.childId ?? null,
          props: props as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn({ err, name }, 'Analytics event dropped');
    }
  }

  async trackMany(
    events: {
      name: EventName;
      userId?: string | null;
      childId?: string | null;
      props?: Record<string, unknown>;
    }[],
  ) {
    if (events.length === 0) return;
    try {
      await this.prisma.analyticsEvent.createMany({
        data: events.map((e) => ({
          name: e.name,
          userId: e.userId ?? null,
          childId: e.childId ?? null,
          props: (e.props ?? {}) as Prisma.InputJsonValue,
        })),
      });
    } catch (err) {
      this.logger.warn({ err }, 'Analytics events dropped');
    }
  }
}

@Global()
@Module({ providers: [AnalyticsService], exports: [AnalyticsService] })
export class AnalyticsModule {}
