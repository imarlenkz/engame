import type { NestExpressApplication } from '@nestjs/platform-express';
import { getPrisma } from '@engame/database';
import request from 'supertest';
import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/bootstrap';

export async function startApp() {
  const { app } = await createApp({ logger: false });
  await app.init();
  return app;
}

/** A browser-like client: keeps cookies and echoes the CSRF cookie in the header on writes. */
export class Client {
  readonly agent: ReturnType<typeof request.agent>;
  private csrf = '';

  constructor(
    app: NestExpressApplication,
    private readonly ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  ) {
    this.agent = request.agent(app.getHttpServer());
  }

  private capture(res: request.Response) {
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = cookies.find((x) => x.startsWith('eg_csrf='));
    if (c) this.csrf = decodeURIComponent(c.split(';')[0]!.slice('eg_csrf='.length));
    return res;
  }

  async get(path: string) {
    return this.capture(await this.agent.get(`/api/v1${path}`).set('X-Forwarded-For', this.ip));
  }

  async send(
    method: 'post' | 'put' | 'patch' | 'delete',
    path: string,
    body?: object,
    opts: { csrf?: boolean } = {},
  ) {
    let req = this.agent[method](`/api/v1${path}`).set('X-Forwarded-For', this.ip);
    if (opts.csrf !== false && this.csrf) req = req.set('X-CSRF-Token', this.csrf);
    return this.capture(await (body ? req.send(body) : req));
  }

  post(path: string, body?: object, opts?: { csrf?: boolean }) {
    return this.send('post', path, body, opts);
  }
  put(path: string, body?: object) {
    return this.send('put', path, body);
  }
  patch(path: string, body?: object) {
    return this.send('patch', path, body);
  }
  delete(path: string) {
    return this.send('delete', path);
  }
}

let n = 0;
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${n++}@example.test`;

export async function registerParent(app: NestExpressApplication) {
  const c = new Client(app);
  const email = uniqueEmail('parent');
  const res = await c.post('/auth/register', {
    email,
    password: 'correct-horse-9',
    displayName: 'Parent',
    acceptTerms: true,
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { client: c, email, user: res.body.user as { id: string } };
}

/** Creates a staff account directly (staff are never self-registered) and signs in. */
export async function staff(app: NestExpressApplication, role: 'ADMIN' | 'TEACHER') {
  const email = uniqueEmail(role.toLowerCase());
  await getPrisma().user.create({
    data: {
      email,
      role,
      displayName: role,
      passwordHash: await hashPassword('staff-password-123'),
      ...(role === 'TEACHER' ? { teacherProfile: { create: {} } } : {}),
    },
  });
  const c = new Client(app);
  const res = await c.post('/auth/login', { email, password: 'staff-password-123' });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}

type Key =
  | { kind: 'none' }
  | { kind: 'choice'; optionId: string }
  | { kind: 'order'; sequence: string[] }
  | { kind: 'match'; pairs: [string, string][] };

type View = { kind: string; tiles?: { id: string; label: string }[] };

/** The correct answer for an answer key (the offline payload includes keys). Order keys hold labels; answers send tile ids. */
export function correctAnswer(key: Key, view?: View) {
  switch (key.kind) {
    case 'none':
      return { kind: 'ack' as const };
    case 'choice':
      return { kind: 'choice' as const, optionId: key.optionId };
    case 'order': {
      const free = [...(view?.tiles ?? [])];
      const sequence = key.sequence.map((label) => {
        const i = free.findIndex((t) => t.label === label);
        if (i < 0) throw new Error(`No tile for ${label}`);
        return free.splice(i, 1)[0]!.id;
      });
      return { kind: 'order' as const, sequence };
    }
    case 'match':
      return { kind: 'match' as const, pairs: key.pairs, moves: key.pairs.length };
  }
}

export interface StartedRun {
  run: { id: string; token: string };
  steps: { items: { id: string; view: View }[] }[];
  keys: Record<string, Key>;
}

export const items = (r: StartedRun) => r.steps.flatMap((s) => s.items);
