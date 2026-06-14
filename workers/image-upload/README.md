# NeuraPress Image Upload Worker

Cloudflare Worker + R2 image upload service for the WeChat editor.

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

The first time you upload an image, the editor will ask for the upload token and save it in local browser storage.
