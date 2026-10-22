import { Injectable } from '@nestjs/common';
import type { Prisma } from '@engame/database';
import { z } from 'zod';
import { EVENT_NAMES } from '../analytics/analytics.service';
import { SessionService } from '../auth/session.service';
import { AuditService } from '../common/audit';
import { Errors } from '../common/errors';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';
import type * as S from './schemas';

const pct = z.number().int().min(0).max(100);
/** Known settings and their shapes; unknown keys are rejected so a typo cannot silently do nothing. */
export const SETTING_SCHEMAS = {
  rewards: z.object({
    correctAnswerXp: z.number().int().min(0).max(100),
    lessonXp: z.number().int().min(0).max(1000),
    perfectLessonBonusXp: z.number().int().min(0).max(1000),
    dailyMissionXp: z.number().int().min(0).max(1000),
    lessonCoins: z.number().int().min(0).max(1000),
    perfectLessonBonusCoins: z.number().int().min(0).max(1000),
    gameCoinsPerCorrect: z.number().int().min(0).max(100),
    starThresholds: z
      .tuple([pct, pct, pct])
      .refine(([a, b, c]) => a < b && b < c, 'Thresholds must increase'),
  }),
  levels: z.object({ xpPerLevelStep: z.number().int().min(10).max(10_000) }),
  hearts: z.object({
    max: z.number().int().min(1).max(20),
    refillMinutes: z.number().int().min(1).max(1440),
  }),
  review: z.object({ maxItemsPerLesson: z.number().int().min(0).max(10) }),
  dailyGoal: z.object({ minutes: z.number().int().min(1).max(120) }),
} as const;
export type SettingKey = keyof typeof SETTING_SCHEMAS;

@Injectable()
export class OpsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly content: ContentService,
  ) {}

  async overview() {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [byRole, children, activeChildren, lessons7d, published] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.childProfile.count({ where: { deletedAt: null } }),
      this.prisma.attempt
        .groupBy({ by: ['childId'], where: { createdAt: { gte: weekAgo } } })
        .then((r) => r.length),
      this.prisma.lessonProgress.count({ where: { completedAt: { gte: weekAgo } } }),
      this.prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    ]);
    return {
      users: Object.fromEntries(byRole.map((r) => [r.role, r._count])),
      children,
      activeChildren7d: activeChildren,
      lessonsCompleted7d: lessons7d,
      publishedLessons: published,
    };
  }

  /** Daily event counts from the first-party analytics table, plus the learning funnel. */
  async analytics(days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.$queryRaw<{ day: Date; name: string; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, name, count(*) AS count
      FROM analytics_events
      WHERE created_at >= ${since}
      GROUP BY 1, 2
      ORDER BY 1`;
    const daily = new Map<string, Record<string, number>>();
    const totals: Record<string, number> = Object.fromEntries(EVENT_NAMES.map((n) => [n, 0]));
    for (const r of rows) {
      const day = r.day.toISOString().slice(0, 10);
      const bucket = daily.get(day) ?? {};
      bucket[r.name] = Number(r.count);
      daily.set(day, bucket);
      totals[r.name] = (totals[r.name] ?? 0) + Number(r.count);
    }
    const [registered, withChild, startedLesson, completedLesson] = await Promise.all([
      this.prisma.user.count({ where: { role: 'PARENT', createdAt: { gte: since } } }),
      this.prisma.user.count({
        where: { role: 'PARENT', createdAt: { gte: since }, parentProfile: { children: { some: {} } } },
      }),
      this.prisma.$queryRaw<
        { n: bigint }[]
      >`SELECT count(DISTINCT child_id) AS n FROM analytics_events WHERE name = 'lesson_started' AND created_at >= ${since}`,
      this.prisma.$queryRaw<
        { n: bigint }[]
      >`SELECT count(DISTINCT child_id) AS n FROM analytics_events WHERE name = 'lesson_completed' AND created_at >= ${since}`,
    ]);
    return {
      days,
      totals,
      daily: [...daily.entries()].map(([day, counts]) => ({ day, ...counts })),
      funnel: {
        parentsRegistered: registered,
        parentsWithChild: withChild,
        childrenStartedLesson: Number(startedLesson[0]?.n ?? 0),
        childrenCompletedLesson: Number(completedLesson[0]?.n ?? 0),
      },
    };
  }

  async users(q: z.infer<typeof S.UserQuery>) {
    const where: Prisma.UserWhereInput = {
      role: q.role,
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' } },
              { displayName: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          role: true,
          status: true,
          email: true,
          displayName: true,
          idpSub: true,
          locale: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: items.map(({ idpSub, ...u }) => ({ ...u, viaImarlenId: idpSub != null })),
    };
  }

  async updateUser(actorId: string, id: string, body: z.infer<typeof S.UserUpdate>) {
    if (id === actorId) throw Errors.badRequest('SELF_EDIT', 'You cannot change your own role or status');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw Errors.notFound('User');
    if (u.role === 'CHILD' && body.role)
      throw Errors.badRequest('CHILD_ROLE', 'Child accounts keep their role');
    const updated = await this.prisma.user.update({ where: { id }, data: body });
    if (body.status === 'DISABLED' || (body.role && body.role !== u.role))
      await this.sessions.revokeAllForUser(id);
    await this.audit.log(actorId, 'user.update', 'user', id, { ...body, previousRole: u.role });
    return { id: updated.id, role: updated.role, status: updated.status };
  }

  async revokeSessions(actorId: string, id: string) {
    await this.sessions.revokeAllForUser(id);
    await this.audit.log(actorId, 'user.revoke_sessions', 'user', id);
    return { ok: true };
  }

  subscriptions() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { owner: { select: { id: true, displayName: true, email: true, role: true } } },
    });
  }

  async createSubscription(actorId: string, body: z.infer<typeof S.SubscriptionCreate>) {
    if (!(await this.prisma.user.findUnique({ where: { id: body.ownerId } }))) throw Errors.notFound('User');
    // Manual record (e.g. a school contract). Online payments need a payment provider integration, which is not configured.
    const s = await this.prisma.subscription.create({
      data: { ...body, provider: 'manual', currentPeriodEnd: body.currentPeriodEnd ?? null },
    });
    await this.audit.log(actorId, 'subscription.create', 'subscription', s.id, {
      plan: s.plan,
      status: s.status,
    });
    return s;
  }

  async updateSubscription(actorId: string, id: string, body: z.infer<typeof S.SubscriptionUpdate>) {
    if (!(await this.prisma.subscription.findUnique({ where: { id } })))
      throw Errors.notFound('Subscription');
    const s = await this.prisma.subscription.update({ where: { id }, data: body });
    await this.audit.log(actorId, 'subscription.update', 'subscription', id, body);
    return s;
  }

  async settings() {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(
      Object.keys(SETTING_SCHEMAS).map((k) => [k, rows.find((r) => r.key === k)?.value ?? null]),
    );
  }

  async updateSetting(actorId: string, key: string, value: unknown) {
    if (!(key in SETTING_SCHEMAS)) throw Errors.notFound('Setting');
    const parsed = SETTING_SCHEMAS[key as SettingKey].parse(value) as Prisma.InputJsonValue;
    const prev = await this.prisma.setting.findUnique({ where: { key } });
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: parsed },
      create: { key, value: parsed },
    });
    await this.content.bump();
    await this.audit.log(actorId, 'setting.update', 'setting', key, {
      from: prev?.value ?? null,
      to: parsed,
    });
    return { key, value: parsed };
  }

  async auditLog(q: { page: number; pageSize: number; q?: string }) {
    const where: Prisma.AuditLogWhereInput = q.q
      ? { OR: [{ action: { startsWith: q.q } }, { entity: q.q }, { entityId: q.q }] }
      : {};
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { actor: { select: { id: true, displayName: true, role: true } } },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: items.map((i) => ({ ...i, id: i.id.toString() })),
    };
  }
}
