import type { NestExpressApplication } from '@nestjs/platform-express';
import { getPrisma } from '@engame/database';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, correctAnswer, items, registerParent, staff, type StartedRun } from './helpers';

let app: NestExpressApplication;
const prisma = getPrisma();

beforeAll(async () => {
  const { startApp } = await import('./helpers');
  app = await startApp();
});
afterAll(async () => {
  await app?.close();
});

async function parentWithChild(opts: { voice?: boolean } = {}) {
  const { client, user } = await registerParent(app);
  const created = await client.post('/children', {
    nickname: 'Aru',
    ageGroup: 'AGE_6_7',
    consents: { dataProcessing: true, voiceProcessing: opts.voice ?? false },
  });
  expect(created.status).toBe(201);
  const childId = created.body.id as string;
  expect((await client.post(`/children/${childId}/select`)).status).toBe(200);
  return { client, user, childId };
}

async function playLesson(client: Client, lessonId: string): Promise<StartedRun> {
  const started = await client.post(`/lessons/${lessonId}/start?offline=1`);
  expect(started.status).toBe(200);
  return started.body as StartedRun;
}

describe('health', () => {
  it('reports liveness and readiness', async () => {
    const c = new Client(app);
    expect((await c.get('/health')).body.status).toBe('ok');
    const ready = await c.get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.checks).toEqual({ database: 'ok', redis: 'ok', storage: 'ok' });
  });

  it('hides metrics without the token', async () => {
    const c = new Client(app);
    expect((await c.get('/metrics')).status).toBe(404);
    const ok = await c.agent.get('/api/v1/metrics').set('Authorization', 'Bearer metrics-test-token');
    expect(ok.status).toBe(200);
    expect(ok.text).toContain('engame_http_request_duration_seconds');
  });
});

describe('auth', () => {
  it('registers a parent with a session cookie and rejects writes without CSRF', async () => {
    const { client } = await registerParent(app);
    const me = await client.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('PARENT');
    const noCsrf = await client.post(
      '/children',
      { nickname: 'X', ageGroup: 'AGE_6_7', consents: { dataProcessing: true } },
      { csrf: false },
    );
    expect(noCsrf.status).toBe(403);
  });

  it('requires accepted terms and validates input', async () => {
    const c = new Client(app);
    const res = await c.post('/auth/register', {
      email: 'bad',
      password: 'x',
      displayName: '',
      acceptTerms: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a wrong password without revealing whether the account exists', async () => {
    const { email } = await registerParent(app);
    const c = new Client(app);
    const wrong = await c.post('/auth/login', { email, password: 'nope-nope-nope' });
    const missing = await c.post('/auth/login', { email: 'nobody@example.test', password: 'nope-nope-nope' });
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(missing.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('blocks anonymous access to learning endpoints', async () => {
    const res = await new Client(app).get('/child/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('children and parent mode', () => {
  it('requires parental consent to create a child', async () => {
    const { client } = await registerParent(app);
    const res = await client.post('/children', {
      nickname: 'Aru',
      ageGroup: 'AGE_6_7',
      consents: { dataProcessing: false },
    });
    expect(res.status).toBe(400);
  });

  it('locks parent screens while a child plays and unlocks with the password', async () => {
    const { client } = await parentWithChild();
    const locked = await client.get('/children');
    expect(locked.status).toBe(400);
    expect(locked.body.error.code).toBe('PARENT_MODE_LOCKED');
    expect((await client.post('/auth/parent-mode', { password: 'wrong' })).status).toBe(400);
    expect((await client.post('/auth/parent-mode', { password: 'correct-horse-9' })).status).toBe(200);
    const list = await client.get('/children');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].consents).toEqual({
      DATA_PROCESSING: true,
      VOICE_PROCESSING: false,
      VOICE_STORAGE: false,
    });
  });

  it("does not let a parent see another family's child", async () => {
    const a = await parentWithChild();
    const b = await registerParent(app);
    const res = await b.client.get(`/progress/children/${a.childId}`);
    expect(res.status).toBe(404);
  });

  it('deletes a child and all learning data', async () => {
    const { client, childId } = await parentWithChild();
    await client.post('/placement/skip');
    await client.post('/auth/parent-mode', { password: 'correct-horse-9' });
    const del = await client.delete(`/children/${childId}`);
    expect(del.body).toEqual({ deleted: true, unlinked: true });
    expect(await prisma.childProfile.findUnique({ where: { id: childId } })).toBeNull();
    expect(await prisma.analyticsEvent.count({ where: { childId } })).toBe(0);
  });
});

describe('lesson flow', () => {
  it('runs placement-skip → lesson → rewards → dashboard', async () => {
    const { client } = await parentWithChild();
    let dash = await client.get('/child/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.needsPlacement).toBe(true);

    await client.post('/placement/skip');
    dash = await client.get('/child/dashboard');
    expect(dash.body.needsPlacement).toBe(false);
    const lessonId = dash.body.currentLesson.id as string;

    const run = await playLesson(client, lessonId);
    const all = items(run);
    expect(all.length).toBeGreaterThan(3);
    for (const item of all) {
      const res = await client.post('/runs/answer', {
        runToken: run.run.token,
        itemId: item.id,
        clientId: randomUUID(),
        answer: correctAnswer(run.keys[item.id]!),
        responseMs: 1500,
      });
      expect(res.status).toBe(200);
      if (run.keys[item.id]!.kind !== 'none') expect(res.body.correct).toBe(true);
    }
    const done = await client.post('/runs/complete', { runToken: run.run.token, durationSec: 240 });
    expect(done.status).toBe(200);
    expect(done.body.alreadyCompleted).toBe(false);
    expect(done.body.outcome.stars).toBe(3);
    expect(done.body.outcome.perfect).toBe(true);
    expect(done.body.child.xp).toBeGreaterThan(0);
    expect(done.body.streak.current).toBe(1);
    expect(done.body.nextLessonId).not.toBe(lessonId);

    // Completing twice never pays twice.
    const again = await client.post('/runs/complete', { runToken: run.run.token });
    expect(again.body.alreadyCompleted).toBe(true);
    expect(again.body.child.xp).toBe(done.body.child.xp);

    dash = await client.get('/child/dashboard');
    expect(dash.body.level.xp).toBe(done.body.child.xp);
    expect(dash.body.progress.lessonsCompleted).toBe(1);
    expect(dash.body.currentLesson.id).toBe(done.body.nextLessonId);

    const report = await client.get('/progress');
    expect(report.status).toBe(200);
    expect(report.body.sounds).toHaveLength(44);
    expect(report.body.lessonsCompleted).toBe(1);
  });

  it('grades on the server: a wrong answer stays wrong and only the first attempt counts', async () => {
    const { client } = await parentWithChild();
    await client.post('/placement/skip');
    const lessonId = (await client.get('/child/dashboard')).body.currentLesson.id;
    const run = await playLesson(client, lessonId);
    const choice = items(run).find((i) => run.keys[i.id]!.kind === 'choice')!;
    const wrong = await client.post('/runs/answer', {
      runToken: run.run.token,
      itemId: choice.id,
      clientId: randomUUID(),
      answer: { kind: 'choice', optionId: 'not-an-option' },
    });
    expect(wrong.body.correct).toBe(false);
    expect(wrong.body.firstAttempt).toBe(true);
    const retry = await client.post('/runs/answer', {
      runToken: run.run.token,
      itemId: choice.id,
      clientId: randomUUID(),
      answer: correctAnswer(run.keys[choice.id]!),
    });
    expect(retry.body.correct).toBe(true);
    expect(retry.body.firstAttempt).toBe(false);
  });

  it('refuses locked lessons and tampered run tokens', async () => {
    const { client } = await parentWithChild();
    await client.post('/placement/skip');
    const last = await prisma.lesson.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: [{ level: { world: { order: 'desc' } } }, { order: 'desc' }],
    });
    expect((await client.post(`/lessons/${last!.id}/start`)).status).toBe(403);

    const lessonId = (await client.get('/child/dashboard')).body.currentLesson.id;
    const run = await playLesson(client, lessonId);
    const [body, sig] = run.run.token.split('.');
    const forged = `${body!.slice(0, -2)}AA.${sig}`;
    const res = await client.post('/runs/answer', {
      runToken: forged,
      itemId: items(run)[0]!.id,
      clientId: randomUUID(),
      answer: { kind: 'ack' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RUN_INVALID');
  });

  it("does not accept another child's run token", async () => {
    const a = await parentWithChild();
    await a.client.post('/placement/skip');
    const run = await playLesson(a.client, (await a.client.get('/child/dashboard')).body.currentLesson.id);
    const b = await parentWithChild();
    const res = await b.client.post('/runs/complete', { runToken: run.run.token });
    expect(res.body.error.code).toBe('RUN_INVALID');
  });
});

describe('offline sync', () => {
  it('replays answers and completion once, idempotently', async () => {
    const { client } = await parentWithChild();
    await client.post('/placement/skip');
    const lessonId = (await client.get('/child/dashboard')).body.currentLesson.id;
    const run = await playLesson(client, lessonId);
    const t0 = Date.now() - 60_000;
    const payload = {
      runs: [
        {
          runToken: run.run.token,
          answers: items(run).map((item, i) => ({
            itemId: item.id,
            clientId: `${run.run.id}:${i}`,
            answer: correctAnswer(run.keys[item.id]!),
            responseMs: 1200,
            answeredAt: new Date(t0 + i * 1000).toISOString(),
          })),
          complete: { durationSec: 200, completedAt: new Date().toISOString() },
        },
      ],
    };
    const first = await client.post('/sync', payload);
    expect(first.status).toBe(200);
    expect(first.body.results[0].ok).toBe(true);
    expect(first.body.results[0].completion.outcome.stars).toBe(3);
    const xp = first.body.results[0].completion.child.xp;

    const second = await client.post('/sync', payload);
    expect(second.body.results[0].ok).toBe(true);
    expect(second.body.results[0].completion.alreadyCompleted).toBe(true);
    expect(second.body.results[0].completion.child.xp).toBe(xp);
  });

  it('accepts large offline batches (beyond the 100 kB body default)', async () => {
    const { client } = await parentWithChild();
    const runs = Array.from({ length: 20 }, () => ({ runToken: `${'a'.repeat(19_990)}.x`, answers: [] }));
    const res = await client.post('/sync', { runs });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(20);
  });

  it('marks a bad token as permanently failed', async () => {
    const { client } = await parentWithChild();
    const res = await client.post('/sync', { runs: [{ runToken: 'x.y', answers: [] }] });
    expect(res.body.results[0]).toEqual({ ok: false, code: 'RUN_INVALID', retry: false });
  });
});

describe('games', () => {
  it('plays a practice game to the end', async () => {
    const { client } = await parentWithChild();
    const list = await client.get('/games');
    expect(list.status).toBe(200);
    const game = list.body.games.find((g: { timed: boolean }) => !g.timed);
    const started = await client.post(`/games/${game.id}/sessions`);
    expect(started.status).toBe(200);
    const first = started.body.steps[0].items[0];
    const ans = await client.post('/game-sessions/answer', {
      runToken: started.body.run.token,
      itemId: first.id,
      clientId: randomUUID(),
      answer:
        first.view.kind === 'choice'
          ? { kind: 'choice', optionId: first.view.options[0].id }
          : { kind: 'ack' },
    });
    expect(ans.status).toBe(200);
    const fin = await client.post('/game-sessions/finish', { runToken: started.body.run.token });
    expect(fin.status).toBe(200);
    expect(fin.body.alreadyFinished).toBe(false);
    const again = await client.post('/game-sessions/finish', { runToken: started.body.run.token });
    expect(again.body.alreadyFinished).toBe(true);
  });
});

describe('pronunciation', () => {
  it('reports that no speech provider is configured instead of faking a score', async () => {
    const { client } = await parentWithChild({ voice: true });
    const caps = await client.get('/pronunciation/capabilities');
    expect(caps.body).toMatchObject({ available: false, reason: 'NOT_CONFIGURED', storesAudio: false });
  });
});

describe('teacher', () => {
  it('creates a class, a parent joins with the code, the roster and CSV show the child', async () => {
    const teacher = await staff(app, 'TEACHER');
    const cls = await teacher.post('/teacher/classes', { name: '1А' });
    expect(cls.status).toBe(201);

    const { client, childId } = await parentWithChild();
    await client.post('/auth/parent-mode', { password: 'correct-horse-9' });
    const join = await client.post(`/children/${childId}/join-class`, { code: cls.body.joinCode });
    expect(join.status).toBe(201);

    const roster = await teacher.get(`/teacher/classes/${cls.body.id}`);
    expect(roster.body.students.map((s: { id: string }) => s.id)).toEqual([childId]);
    const report = await teacher.get(`/progress/children/${childId}`);
    expect(report.status).toBe(200);
    const csv = await teacher.get(`/teacher/classes/${cls.body.id}/report.csv`);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Aru');

    const lesson = await prisma.lesson.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { order: 'desc' },
    });
    expect(
      (await teacher.post(`/teacher/classes/${cls.body.id}/assignments`, { lessonId: lesson!.id })).status,
    ).toBe(201);
    // Assigned lessons open even if the child has not reached them yet.
    await client.post(`/children/${childId}/select`);
    const assigned = await client.get('/assignments');
    expect(assigned.body).toHaveLength(1);
    expect((await client.post(`/lessons/${lesson!.id}/start`)).status).toBe(200);
  });

  it('keeps other teachers out of the class', async () => {
    const t1 = await staff(app, 'TEACHER');
    const t2 = await staff(app, 'TEACHER');
    const cls = await t1.post('/teacher/classes', { name: '2Б' });
    expect((await t2.get(`/teacher/classes/${cls.body.id}`)).status).toBe(404);
  });

  it('forbids parents from teacher endpoints', async () => {
    const { client } = await registerParent(app);
    expect((await client.get('/teacher/classes')).status).toBe(403);
  });
});

describe('admin CMS', () => {
  it('refuses to publish an invalid lesson and publishes a valid one', async () => {
    const admin = await staff(app, 'ADMIN');
    const level = await prisma.level.findFirstOrThrow({ orderBy: { order: 'asc' } });
    const lesson = await admin.post('/admin/lessons', {
      levelId: level.id,
      slug: `test-lesson-${Date.now()}`,
      order: 999,
      kind: 'WORD',
      title: { en: 'Test', kk: 'Тест' },
    });
    expect(lesson.status).toBe(201);
    const id = lesson.body.id;

    const empty = await admin.patch(`/admin/lessons/${id}`, { status: 'PUBLISHED' });
    expect(empty.body.error.code).toBe('CONTENT_INVALID');

    const bad = await admin.post(`/admin/lessons/${id}/exercises`, {
      stage: 'PRACTICE',
      type: 'no_such_type',
      config: {},
    });
    expect(bad.body.error.code).toBe('CONTENT_INVALID');

    const types = await admin.get('/admin/exercise-types');
    expect(types.body.map((t: { key: string }) => t.key)).toContain('word_builder');

    const ex = await admin.post(`/admin/lessons/${id}/exercises`, {
      stage: 'PRACTICE',
      type: 'word_builder',
      config: { words: ['zzzz'] },
    });
    expect(ex.status).toBe(201);
    const invalid = await admin.patch(`/admin/lessons/${id}`, { status: 'PUBLISHED' });
    expect(invalid.body.error.code).toBe('CONTENT_INVALID');
    expect(JSON.stringify(invalid.body.error.details)).toContain('word:zzzz');

    expect(
      (await admin.patch(`/admin/exercises/${ex.body.id}`, { config: { words: ['cat', 'dog'] } })).status,
    ).toBe(200);
    const ok = await admin.patch(`/admin/lessons/${id}`, { status: 'PUBLISHED' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('PUBLISHED');

    const preview = await admin.post(`/admin/lessons/${id}/preview`);
    expect(preview.body.steps[0].items.length).toBeGreaterThan(0);
  });

  it('will not unpublish a word that published lessons use', async () => {
    const admin = await staff(app, 'ADMIN');
    const cat = await prisma.word.findUniqueOrThrow({ where: { text: 'cat' } });
    const res = await admin.patch(`/admin/words/${cat.id}`, { status: 'DRAFT' });
    expect(res.body.error.code).toBe('CONTENT_INVALID');
  });

  it('validates word spelling against its sounds', async () => {
    const admin = await staff(app, 'ADMIN');
    const res = await admin.post('/admin/words', {
      text: 'zap',
      pattern: 'CVC',
      translation: { kk: 'зап' },
      breakdown: [
        { phoneme: 'z', grapheme: 'z' },
        { phoneme: 'ae', grapheme: 'a' },
      ],
    });
    expect(res.body.error.code).toBe('CONTENT_INVALID');
    const ok = await admin.post('/admin/words', {
      text: 'zap',
      pattern: 'CVC',
      translation: { kk: 'зап' },
      breakdown: [
        { phoneme: 'z', grapheme: 'z' },
        { phoneme: 'ae', grapheme: 'a' },
        { phoneme: 'p', grapheme: 'p' },
      ],
    });
    expect(ok.status).toBe(201);
  });

  it('validates settings and records an audit trail', async () => {
    const admin = await staff(app, 'ADMIN');
    expect((await admin.put('/admin/settings/dailyGoal', { minutes: 0 })).status).toBe(400);
    expect((await admin.put('/admin/settings/unknown', { a: 1 })).status).toBe(404);
    const ok = await admin.put('/admin/settings/dailyGoal', { minutes: 15 });
    expect(ok.status).toBe(200);
    const audit = await admin.get('/admin/audit?q=setting');
    expect(audit.body.items[0].action).toBe('setting.update');
    await admin.put('/admin/settings/dailyGoal', { minutes: 10 });
  });

  it('keeps non-admins out', async () => {
    const teacher = await staff(app, 'TEACHER');
    expect((await teacher.get('/admin/overview')).status).toBe(403);
  });

  it('serves analytics from recorded events', async () => {
    const admin = await staff(app, 'ADMIN');
    const res = await admin.get('/admin/analytics?days=7');
    expect(res.status).toBe(200);
    expect(res.body.totals.lesson_completed).toBeGreaterThan(0);
  });
});
