# EnGame — бастауыш сынып балаларына арналған ағылшын фоникасы

EnGame — 6–10 жастағы балаларға ағылшын тілінің 44 дыбысын (phonics), әріптерді, сөз құрауды және оқуды
ойын арқылы үйрететін веб-платформа. Сайт: **https://engame.imarlen.kz** (iMARLEN ID арқылы кіру).

## Не бар

| Бөлім | Мүмкіндіктер |
|---|---|
| Бала | 5 әлем (Alphabet Forest → Reading Kingdom), 87 сабақ, 563 жаттығу, деңгейді анықтау тесті, қайталау (spaced repetition), 8 ойын, XP / тиын / жүрек / streak, марапаттар, күнделікті тапсырмалар, дыбыстар картасы, offline сабақтар |
| Ата-ана | Бірнеше бала профилі, PIN-мен қорғалған ата-ана аймағы, келісімдер (деректер, дауыс), есеп: уақыт, сабақтар, меңгерілген дыбыстар, әлсіз дыбыстар, апталық белсенділік; сыныпқа қосылу; профильді толық өшіру |
| Мұғалім | Сыныптар, қосылу коды, тапсырмалар, оқушылар есебі, CSV экспорт |
| Админ | CMS: дыбыстар, әріптер, сөздер, сөйлемдер, әлемдер / деңгейлер / сабақтар / жаттығулар (тексеру + жариялау), ойындар, марапаттар, тапсырмалар, медиа (аудио/сурет), пайдаланушылар, жазылымдар (қолмен), аналитика, баптаулар, аудит журналы |
| Платформа | kk / ru / en интерфейс, PWA (орнату, offline), Swagger, health / ready / Prometheus metrics, rate limit, CSRF, аудит, бэкап |

## Адал шектеулер

- **Дыбыс жазбалары.** Әр дыбыстың аудиосын админ CMS → Медиа арқылы жүктеу керек. Жазба жоқ сөздерді браузердің
  speechSynthesis дауысы оқиды; жалғыз дыбыстарда «Жазба әлі жоқ» деп көрсетіледі (жасанды дыбыс шығармаймыз).
- **Айтылымды тексеру** `SPEECH_PROVIDER=whisper` (OpenAI-үйлесімді `/audio/transcriptions` endpoint) қосылғанда ғана
  жұмыс істейді. Баға транскрипцияға негізделген, сондықтан шамамен; интерфейсте солай жазылған. Аудио сақталмайды,
  ата-ананың «дауыс» келісімі керек. Қосылмаса — функция өшік екені көрсетіледі.
- **Төлем жүйесі қосылмаған.** Жазылымдарды админ қолмен енгізеді (мысалы, мектеппен келісімшарт).
- **Memory ойыны** жұптарды клиентте көрсетеді, бірақ нәтижені сервер қайта тексереді.

## Архитектура

```
браузер ──HTTPS──> хост nginx (Let's Encrypt) ──> gateway nginx :4300 ─┬─ /api ─> api  (NestJS, :4000) ─┬─ PostgreSQL 16
                                                                        └─ /     ─> web (Next.js, :3000)  └─ Redis 7
```

| Бума | Мазмұны |
|---|---|
| `apps/api` | NestJS 11 API: auth (сессия cookie + CSRF, iMARLEN ID OIDC), learning (сабақ, run token, бағалау), games, progress, children, teacher, sync (offline), speech, admin, health |
| `apps/web` | Next.js 15 App Router, React 19, Tailwind, React Query; service worker + IndexedDB offline |
| `packages/database` | Prisma схемасы, миграциялар, бастапқы контент (seed, қайта іске қосуға қауіпсіз) |
| `packages/phonics-engine` | Жаттығу генерациясы, бағалау, адаптивті меңгеру, қайталау кестесі |
| `packages/game-engine` | Ойын жоспарлау, XP / деңгей / марапат ережелері |
| `packages/localization` | kk / ru / en сөздіктері (типтелген, барлық кілттер тексеріледі) |
| `infra/` | Dockerfile, nginx, deploy / backup / restore скрипттері, Prometheus |

Негізгі шешімдер:
- Сабақ басталғанда сервер жаттығуларды seed бойынша құрып, HMAC-пен қол қойылған **run token** береді; жауаптар
  серверде бағаланады, бірінші әрекет қана есептеледі, `clientId` бойынша идемпотентті.
- Бір баланың жауаптары, сабақты аяқтау және марапаттар Postgres advisory lock ішінде орындалады (қайталанған сұраныс
  марапатты екі рет бермейді).
- Offline: сабақ жауап кілттерімен бірге IndexedDB-ге жүктеледі, жауаптар кезекке жиналып, желі пайда болғанда
  `POST /api/v1/sync` арқылы жіберіледі; сервер бәрін қайта бағалайды.

## Жергілікті әзірлеу

Талаптар: Node 22, pnpm 10, PostgreSQL 16, Redis 7.

```bash
pnpm install
export DATABASE_URL=postgresql://postgres@localhost:5432/engame
pnpm db:deploy && pnpm db:seed
pnpm turbo run build --filter "./packages/*"

# API (http://localhost:4000/api/v1/docs — Swagger)
cd apps/api && APP_ORIGIN=http://localhost:3000 REDIS_URL=redis://localhost:6379 \
  APP_SECRET=$(openssl rand -hex 32) STORAGE_LOCAL_DIR=./uploads pnpm build && node dist/main.js

# Web (http://localhost:3000, /api сұраныстарын API-ге жібереді)
cd apps/web && pnpm dev

# Админ жасау
cd apps/api && ADMIN_PASSWORD='...' node dist/cli.js create-admin you@example.com "Your Name"
```

## Тесттер

```bash
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres pnpm turbo run build typecheck test
# E2E (API мен web іске қосулы болғанда; API: TRUST_PROXY_HOPS=2)
E2E_BASE_URL=http://localhost:3000 pnpm --filter @engame/web e2e
```

- API интеграциялық тесттері әр іске қосуда бөлек уақытша дерекқор жасап, соңында өшіреді.
- E2E: ата-ана тіркелуі → бала қосу → сабақты толық өту → PIN → есеп; бала сессиясы ата-ана/админ API-ге кіре
  алмайды; админ баптауды өзгертеді және ол аудитте көрінеді (desktop + планшет).

## Production

Толық нұсқаулық: [docs/DEPLOY.md](docs/DEPLOY.md). Қысқаша: `.env` толтыру → `infra/scripts/deploy.sh`.
GitHub Actions: `CI` (build, typecheck, тесттер, E2E, Docker образдары) және `Deploy` (CI сәтті болса, main → VPS).
