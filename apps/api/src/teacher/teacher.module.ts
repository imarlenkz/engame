import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type { AuthContext } from '../auth/auth.types';
import { ChildGuard } from '../auth/child.guard';
import { ActingChild, Auth, RequireParentMode, Roles } from '../auth/decorators';
import { AuditService } from '../common/audit';
import { Errors } from '../common/errors';
import { RateLimit } from '../common/rate-limit';
import { ZodBody, type Infer } from '../common/zod';
import { PrismaService } from '../infra/infra.module';
import { ChildrenService } from '../children/children.module';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newJoinCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

const ClassSchema = z.object({ name: z.string().trim().min(1).max(60) });
const UpdateClassSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  archived: z.boolean().optional(),
});
const AssignmentSchema = z.object({
  lessonId: z.string().uuid(),
  kind: z.enum(['LESSON', 'HOMEWORK']).default('LESSON'),
  dueAt: z.coerce.date().optional(),
});
const JoinSchema = z.object({ code: z.string().trim().toUpperCase().length(6) });

const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection from user-provided names.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async ownClass(teacherId: string, classId: string) {
    const c = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!c) throw Errors.notFound('Class');
    return c;
  }

  private async uniqueCode() {
    for (let i = 0; i < 10; i++) {
      const code = newJoinCode();
      if (!(await this.prisma.class.findUnique({ where: { joinCode: code } }))) return code;
    }
    throw new Error('Could not allocate a join code');
  }

  async list(teacherId: string) {
    const classes = await this.prisma.class.findMany({
      where: { teacherId },
      orderBy: [{ archivedAt: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { members: true, assignments: true } } },
    });
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      joinCode: c.joinCode,
      archived: c.archivedAt != null,
      students: c._count.members,
      assignments: c._count.assignments,
    }));
  }

  async create(teacherId: string, name: string) {
    await this.prisma.teacherProfile.upsert({
      where: { userId: teacherId },
      update: {},
      create: { userId: teacherId },
    });
    const c = await this.prisma.class.create({
      data: { teacherId, name, joinCode: await this.uniqueCode() },
    });
    await this.audit.log(teacherId, 'class.create', 'class', c.id);
    return { id: c.id, name: c.name, joinCode: c.joinCode, archived: false };
  }

  async update(teacherId: string, classId: string, body: Infer<typeof UpdateClassSchema>) {
    await this.ownClass(teacherId, classId);
    const c = await this.prisma.class.update({
      where: { id: classId },
      data: {
        name: body.name,
        archivedAt: body.archived === undefined ? undefined : body.archived ? new Date() : null,
      },
    });
    return { id: c.id, name: c.name, joinCode: c.joinCode, archived: c.archivedAt != null };
  }

  async regenerateCode(teacherId: string, classId: string) {
    await this.ownClass(teacherId, classId);
    const c = await this.prisma.class.update({
      where: { id: classId },
      data: { joinCode: await this.uniqueCode() },
    });
    return { joinCode: c.joinCode };
  }

  /** Class roster with the numbers a teacher scans: level, lessons, mastered sounds, weak sounds, last activity. */
  async roster(teacherId: string, classId: string) {
    const c = await this.ownClass(teacherId, classId);
    const members = await this.prisma.classMember.findMany({
      where: { classId, child: { deletedAt: null } },
      include: { child: true },
      orderBy: { joinedAt: 'asc' },
    });
    const ids = members.map((m) => m.childId);
    const [lessons, mastered, weak, lastActive, assignments] = await Promise.all([
      this.prisma.lessonProgress.groupBy({
        by: ['childId'],
        where: { childId: { in: ids }, status: 'COMPLETED' },
        _count: true,
      }),
      this.prisma.mastery.groupBy({
        by: ['childId'],
        where: { childId: { in: ids }, itemType: 'PHONEME', masteredAt: { not: null } },
        _count: true,
      }),
      this.prisma.mastery.groupBy({
        by: ['childId'],
        where: { childId: { in: ids }, itemType: 'PHONEME', score: { lt: 40 }, attempts: { gte: 3 } },
        _count: true,
      }),
      this.prisma.attempt.groupBy({
        by: ['childId'],
        where: { childId: { in: ids } },
        _max: { createdAt: true },
      }),
      this.prisma.assignment.findMany({
        where: { classId },
        orderBy: { createdAt: 'desc' },
        include: { lesson: { select: { id: true, slug: true, title: true } } },
      }),
    ]);
    const count = (rows: { childId: string; _count: number }[]) =>
      new Map(rows.map((r) => [r.childId, r._count]));
    const [lessonsBy, masteredBy, weakBy] = [count(lessons), count(mastered), count(weak)];
    const lastBy = new Map(lastActive.map((r) => [r.childId, r._max.createdAt]));
    const done = await this.prisma.lessonProgress.findMany({
      where: {
        childId: { in: ids },
        lessonId: { in: assignments.map((a) => a.lessonId) },
        status: 'COMPLETED',
      },
      select: { childId: true, lessonId: true },
    });
    return {
      class: { id: c.id, name: c.name, joinCode: c.joinCode, archived: c.archivedAt != null },
      students: members.map(({ child }) => ({
        id: child.id,
        nickname: child.nickname,
        avatar: child.avatar,
        level: child.level,
        xp: child.xp,
        lessonsCompleted: lessonsBy.get(child.id) ?? 0,
        soundsMastered: masteredBy.get(child.id) ?? 0,
        weakSounds: weakBy.get(child.id) ?? 0,
        lastActiveAt: lastBy.get(child.id) ?? null,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        kind: a.kind,
        dueAt: a.dueAt,
        lesson: a.lesson,
        completed: done.filter((d) => d.lessonId === a.lessonId).length,
        total: members.length,
      })),
    };
  }

  async removeMember(teacherId: string, classId: string, childId: string) {
    await this.ownClass(teacherId, classId);
    await this.prisma.classMember.deleteMany({ where: { classId, childId } });
    await this.audit.log(teacherId, 'class.remove_member', 'class', classId, { childId });
    return { ok: true };
  }

  async assign(teacherId: string, classId: string, body: Infer<typeof AssignmentSchema>) {
    await this.ownClass(teacherId, classId);
    const lesson = await this.prisma.lesson.findFirst({ where: { id: body.lessonId, status: 'PUBLISHED' } });
    if (!lesson) throw Errors.notFound('Lesson');
    const a = await this.prisma.assignment.create({
      data: { classId, lessonId: lesson.id, kind: body.kind, dueAt: body.dueAt ?? null },
    });
    await this.audit.log(teacherId, 'assignment.create', 'class', classId, { lessonId: lesson.id });
    return a;
  }

  async unassign(teacherId: string, classId: string, assignmentId: string) {
    await this.ownClass(teacherId, classId);
    await this.prisma.assignment.deleteMany({ where: { id: assignmentId, classId } });
    return { ok: true };
  }

  async csv(teacherId: string, classId: string) {
    const r = await this.roster(teacherId, classId);
    const header = [
      'nickname',
      'level',
      'xp',
      'lessons_completed',
      'sounds_mastered',
      'weak_sounds',
      'last_active',
    ];
    const lines = r.students.map((s) =>
      [
        s.nickname,
        s.level,
        s.xp,
        s.lessonsCompleted,
        s.soundsMastered,
        s.weakSounds,
        s.lastActiveAt?.toISOString() ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
    // BOM so Excel opens Cyrillic/Kazakh names correctly.
    return '﻿' + [header.join(','), ...lines].join('\n') + '\n';
  }

  /** What the child's teachers assigned, with completion state. */
  async childAssignments(childId: string) {
    const rows = await this.prisma.assignment.findMany({
      where: { class: { archivedAt: null, members: { some: { childId } } } },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        lesson: { select: { id: true, slug: true, title: true, estimatedMinutes: true } },
        class: { select: { name: true } },
      },
      take: 50,
    });
    const done = new Set(
      (
        await this.prisma.lessonProgress.findMany({
          where: { childId, lessonId: { in: rows.map((r) => r.lessonId) }, status: 'COMPLETED' },
          select: { lessonId: true },
        })
      ).map((d) => d.lessonId),
    );
    return rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      dueAt: a.dueAt,
      className: a.class.name,
      lesson: a.lesson,
      completed: done.has(a.lessonId),
    }));
  }

  async join(parentId: string, childId: string, code: string, children: ChildrenService) {
    await children.assertGuardian(parentId, childId);
    const c = await this.prisma.class.findUnique({ where: { joinCode: code } });
    if (!c || c.archivedAt) throw Errors.notFound('Class');
    await this.prisma.classMember.upsert({
      where: { classId_childId: { classId: c.id, childId } },
      update: {},
      create: { classId: c.id, childId },
    });
    await this.audit.log(parentId, 'class.join', 'class', c.id, { childId });
    return { class: { id: c.id, name: c.name } };
  }
}

@ApiTags('teacher')
@Roles('TEACHER')
@Controller('teacher/classes')
export class TeacherController {
  constructor(private readonly teacher: TeacherService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.teacher.list(auth.user.id);
  }

  @Post()
  create(@Auth() auth: AuthContext, @ZodBody(ClassSchema) body: Infer<typeof ClassSchema>) {
    return this.teacher.create(auth.user.id, body.name);
  }

  @Get(':id')
  roster(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.roster(auth.user.id, id);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateClassSchema) body: Infer<typeof UpdateClassSchema>,
  ) {
    return this.teacher.update(auth.user.id, id, body);
  }

  @HttpCode(200)
  @Post(':id/join-code')
  regenerate(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.regenerateCode(auth.user.id, id);
  }

  @Delete(':id/members/:childId')
  removeMember(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    return this.teacher.removeMember(auth.user.id, id, childId);
  }

  @Post(':id/assignments')
  assign(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(AssignmentSchema) body: Infer<typeof AssignmentSchema>,
  ) {
    return this.teacher.assign(auth.user.id, id, body);
  }

  @Delete(':id/assignments/:assignmentId')
  unassign(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.teacher.unassign(auth.user.id, id, assignmentId);
  }

  @Get(':id/report.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="class-report.csv"')
  csv(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.csv(auth.user.id, id);
  }
}

@ApiTags('assignments')
@Controller()
export class AssignmentsController {
  constructor(
    private readonly teacher: TeacherService,
    private readonly children: ChildrenService,
  ) {}

  @UseGuards(ChildGuard)
  @Get('assignments')
  mine(@ActingChild() childId: string) {
    return this.teacher.childAssignments(childId);
  }

  /** A parent adds their child to a class with the teacher's join code. */
  @Roles('PARENT')
  @RequireParentMode()
  @RateLimit({ name: 'class-join', limit: 10, windowSec: 600 })
  @Post('children/:id/join-class')
  join(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(JoinSchema) body: Infer<typeof JoinSchema>,
  ) {
    return this.teacher.join(auth.user.id, id, body.code, this.children);
  }
}

@Module({ imports: [], controllers: [TeacherController, AssignmentsController], providers: [TeacherService] })
export class TeacherModule {}
