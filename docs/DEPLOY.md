# EnGame-ді VPS-ке орнату (engame.imarlen.kz)

## 1. Сервер

- Ubuntu 22.04/24.04, кемінде 2 vCPU / 4 GB RAM / 30 GB диск.
- Docker Engine + Compose plugin, nginx, certbot:
  ```bash
  curl -fsSL https://get.docker.com | sh
  apt-get install -y nginx certbot git
  ```
- DNS: `engame.imarlen.kz` → сервер IP (A / AAAA жазбасы).

## 2. Код және `.env`

```bash
git clone <repo-url> /opt/engame && cd /opt/engame
cp .env.example .env && chmod 600 .env
openssl rand -base64 48   # APP_SECRET үшін
openssl rand -base64 24   # POSTGRES_PASSWORD үшін
nano .env
```

Міндетті: `APP_SECRET`, `POSTGRES_PASSWORD`. Кілттер тек `.env`-те, кодта ешқандай кілт жоқ.

## 3. iMARLEN ID

`id.imarlen.kz` админ панелінде OIDC клиентін тіркеңіз:

| Өріс | Мән |
|---|---|
| Client ID | `engame` |
| Redirect URI | `https://engame.imarlen.kz/api/v1/auth/idp/callback` |
| Post-logout redirect | `https://engame.imarlen.kz/login` |
| Scopes | `openid profile email` |

Берілген client secret-ті `.env` → `OIDC_CLIENT_SECRET`-ке жазыңыз. Үш OIDC айнымалысының бәрі бос болса,
«iMARLEN ID арқылы кіру» батырмасы көрсетілмейді.

## 4. Іске қосу

```bash
infra/scripts/deploy.sh
```

Скрипт: образдарды жинайды → (дерекқор бар болса) бэкап жасайды → миграция + бастапқы контент → api / web / gateway
іске қосады → `/api/v1/ready` тексереді. Gateway тек `127.0.0.1:4300`-те тыңдайды.

Бірінші админ:
```bash
docker compose exec -e ADMIN_PASSWORD='ұзын-құпия-сөз' api node dist/cli.js create-admin admin@imarlen.kz "Marlen"
# немесе iMARLEN ID арқылы кірген пайдаланушыға рөл беру:
docker compose exec api node dist/cli.js set-role admin@imarlen.kz ADMIN
```

## 5. nginx + Let's Encrypt

```bash
mkdir -p /var/www/letsencrypt
# Сертификат алғанға дейін 443 блогын уақытша алып тастап, тек 80 блогымен бастаңыз:
cp infra/nginx/engame.imarlen.kz.conf /etc/nginx/sites-available/engame.imarlen.kz
ln -s /etc/nginx/sites-available/engame.imarlen.kz /etc/nginx/sites-enabled/
certbot certonly --webroot -w /var/www/letsencrypt -d engame.imarlen.kz
nginx -t && systemctl reload nginx
```

Certbot таймері сертификатты өзі жаңартады; жаңартудан кейін nginx-ті қайта жүктеу үшін:
`echo 'systemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh && chmod +x $_`

## 6. Бэкап

```bash
crontab -e
30 3 * * * cd /opt/engame && infra/scripts/backup.sh >> /var/log/engame-backup.log 2>&1
```

`backups/` ішінде 14 күн сақталады (`BACKUP_KEEP_DAYS`). Бэкаптарды серверден тыс жерге де көшіріңіз
(мысалы, `rclone` / `restic`). Қалпына келтіру:

```bash
infra/scripts/restore.sh backups/db-YYYYMMDD-HHMMSS.dump backups/uploads-YYYYMMDD-HHMMSS.tar.gz
```

## 7. Мониторинг

- `GET /api/v1/health` — процесс тірі; `GET /api/v1/ready` — дерекқор, Redis, storage (503 ақауда).
- Prometheus метрикалары: `.env`-те `METRICS_TOKEN` орнатып, `docker compose --profile monitoring up -d prometheus`
  (127.0.0.1:9090, SSH туннель арқылы ашыңыз). Alert ережелері: `infra/monitoring/alerts.yml`.
- Сыртқы uptime тексеру (мысалы, UptimeRobot) → `https://engame.imarlen.kz/api/v1/ready`.
- Логтар: `docker compose logs -f api` (JSON, request id, құпиялар жасырылған).

## 8. GitHub Actions арқылы автоматты deploy

Repository → Settings → Secrets and variables → Actions:

| Secret | Мәні |
|---|---|
| `VPS_HOST` | сервер IP / хост |
| `VPS_USER` | deploy пайдаланушысы (docker тобында) |
| `VPS_SSH_KEY` | осы пайдаланушының private key-і |
| `VPS_KNOWN_HOSTS` | `ssh-keyscan <host>` нәтижесі |

Қосымша variable: `VPS_PATH` (әдепкі `/opt/engame`). `main`-ге push → CI сәтті → Deploy. Қолмен: Actions → Deploy →
Run workflow.

## 9. Қосымша баптаулар

| Айнымалы | Мақсаты |
|---|---|
| `SPEECH_PROVIDER=whisper`, `SPEECH_API_URL`, `SPEECH_API_KEY` | Айтылымды тексеру |
| `STORAGE_DRIVER=s3`, `S3_*` | Медианы S3-үйлесімді қоймада сақтау |
| `AUTH_LOCAL_REGISTRATION=false` | Тек iMARLEN ID арқылы тіркелу |
| `SWAGGER_PUBLIC=true` | Production-да `/api/v1/docs` ашу |
| `NODE_IMAGE` | Docker Hub шектеу қойса, базалық образ айнасы (мысалы `mirror.gcr.io/library/node:22.20.0-bookworm-slim`) |
