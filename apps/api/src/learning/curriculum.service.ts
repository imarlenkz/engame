import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/infra.module';

export interface OrderedLesson {
  id: string;
  slug: string;
  worldSlug: string;
  index: number;
}

/** Published lessons in learning order (world → level → lesson) and the unlock rule. */
@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async ordered(): Promise<OrderedLesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { status: 'PUBLISHED', level: { status: 'PUBLISHED', world: { status: 'PUBLISHED' } } },
      select: {
        id: true,
        slug: true,
        order: true,
        level: { select: { order: true, world: { select: { slug: true, order: true } } } },
      },
    });
    return lessons
      .sort(
        (a, b) =>
          a.level.world.order - b.level.world.order || a.level.order - b.level.order || a.order - b.order,
      )
      .map((l, index) => ({ id: l.id, slug: l.slug, worldSlug: l.level.world.slug, index }));
  }

  /**
   * A lesson is open when it is at or before the child's current lesson, or already completed.
   * With no current lesson yet, the first lesson is open.
   */
  async unlockState(childId: string) {
    const [ordered, child, completed] = await Promise.all([
      this.ordered(),
      this.prisma.childProfile.findUniqueOrThrow({
        where: { id: childId },
        select: { currentLessonId: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { childId, status: 'COMPLETED' },
        select: { lessonId: true },
      }),
    ]);
    const done = new Set(completed.map((c) => c.lessonId));
    const currentIndex = Math.max(
      0,
      ordered.findIndex((l) => l.id === child.currentLessonId),
    );
    const unlocked = new Set(
      ordered.filter((l) => l.index <= currentIndex || done.has(l.id)).map((l) => l.id),
    );
    return { ordered, unlocked, done, current: ordered[currentIndex] ?? null };
  }

  async firstLessonOfWorld(worldSlug: string): Promise<string | null> {
    return (await this.ordered()).find((l) => l.worldSlug === worldSlug)?.id ?? null;
  }

  /** The lesson after `lessonId` in learning order, if any. */
  async nextAfter(lessonId: string): Promise<string | null> {
    const ordered = await this.ordered();
    const i = ordered.findIndex((l) => l.id === lessonId);
    return i >= 0 ? (ordered[i + 1]?.id ?? null) : null;
  }
}
