# NeuraPress Cloud Worker

Cloudflare Worker + R2 service for image uploads and article backups in the WeChat editor.

## Setup

1. Install dependencies:

```bash
cd workers/image-upload
pnpm install
```

2. Create an R2 bucket:

```bash
pnpm wrangler r2 bucket create neurapress-images
```

3. Set an upload token. This is optional in code, but strongly recommended:

```bash
pnpm wrangler secret put UPLOAD_TOKEN
```

4. Edit `wrangler.toml`:

```toml
ALLOWED_ORIGINS = "http://localhost:3001,https://coxier.github.io"
MAX_UPLOAD_BYTES = "5242880"
PUBLIC_BASE_URL = ""
```

If `PUBLIC_BASE_URL` is empty, uploaded images are served by the Worker:

```text
https://your-worker.workers.dev/file/uploads/2026/06/hash.png
```

If you later bind a custom image domain, set:

```toml
PUBLIC_BASE_URL = "https://img.example.com"
```

5. Deploy:

```bash
pnpm wrangler deploy
```

6. Configure the editor:

Create `.env.local` at the repo root:

```bash
NEXT_PUBLIC_IMAGE_UPLOAD_ENDPOINT=https://your-worker.workers.dev/upload
```

Restart `next dev` after changing `.env.local`.

Open the editor settings and fill in the Worker `/upload` URL plus `UPLOAD_TOKEN`. The token is saved only in local browser storage.

## API

All write APIs require an allowed `Origin` and the `UPLOAD_TOKEN`.

- `POST /upload` uploads an image file from multipart field `file`.
- `GET /file/<key>` serves an uploaded image.
- `POST /articles/<deviceId>/<articleId>` saves the latest article backup.
- `GET /articles/<deviceId>/<articleId>/latest` returns the latest article backup.
