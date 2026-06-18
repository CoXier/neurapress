export interface Env {
  IMAGES: R2Bucket
  ALLOWED_ORIGINS?: string
  MAX_UPLOAD_BYTES?: string
  PUBLIC_BASE_URL?: string
  UPLOAD_TOKEN?: string
}

type UploadResult = {
  url: string
  key: string
  size: number
  contentType: string
}

type ArticleBackupPayload = {
  title?: string
  content?: string
  source?: string
  mode?: string
  deviceId?: string
  clientUpdatedAt?: string
}

type ArticleBackup = {
  id: string
  title: string
  content: string
  source: string
  mode: string
  deviceId: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

type ArticleIndexEntry = {
  id: string
  title: string
  source: string
  mode: string
  deviceId: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

type UploadedFile = {
  name?: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_ARTICLE_BYTES = 2 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
}

function parseAllowedOrigins(value?: string) {
  return (value || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

function isOriginAllowed(origin: string | null, env: Env) {
  if (!origin) return false

  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS)
  if (allowedOrigins.includes('*')) return true

  return allowedOrigins.includes(origin)
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('origin')
  const allowOrigin = isOriginAllowed(origin, env) ? origin : ''

  return {
    ...(allowOrigin ? { 'access-control-allow-origin': allowOrigin } : {}),
    'access-control-allow-methods': 'GET, HEAD, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-upload-token',
    'access-control-max-age': '86400',
    vary: 'Origin'
  }
}

function json(request: Request, env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(request, env)
    }
  })
}

function unauthorized(request: Request, env: Env) {
  return json(request, env, { error: 'UNAUTHORIZED' }, 401)
}

function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }

  return request.headers.get('x-upload-token') || ''
}

function isAuthorized(request: Request, env: Env) {
  if (!env.UPLOAD_TOKEN) return true

  return getBearerToken(request) === env.UPLOAD_TOKEN
}

function requireApiAccess(request: Request, env: Env) {
  if (!isOriginAllowed(request.headers.get('origin'), env)) {
    return json(request, env, { error: 'ORIGIN_NOT_ALLOWED' }, 403)
  }

  if (!isAuthorized(request, env)) {
    return unauthorized(request, env)
  }

  return null
}

function getMaxUploadBytes(env: Env) {
  const parsed = Number(env.MAX_UPLOAD_BYTES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES
}

function getExtension(contentType: string) {
  return EXTENSIONS[contentType.toLowerCase()]
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(buffer: ArrayBuffer) {
  return toHex(await crypto.subtle.digest('SHA-256', buffer))
}

function buildObjectKey(hash: string, extension: string) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `uploads/${year}/${month}/${hash}.${extension}`
}

function buildPublicUrl(request: Request, env: Env, key: string) {
  const baseUrl = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '')
  if (baseUrl) return `${baseUrl}/${key}`

  const url = new URL(request.url)
  return `${url.origin}/file/${key}`
}

function isUploadedFile(value: unknown): value is UploadedFile {
  return typeof value === 'object'
    && value !== null
    && 'type' in value
    && 'size' in value
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function'
}

async function getFileFromRequest(request: Request): Promise<UploadedFile | null> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as unknown
    return isUploadedFile(file) ? file : null
  }

  return null
}

async function handleUpload(request: Request, env: Env) {
  const accessError = requireApiAccess(request, env)
  if (accessError) return accessError

  const file = await getFileFromRequest(request)
  if (!file) {
    return json(request, env, { error: 'MISSING_FILE' }, 400)
  }

  const contentType = file.type.toLowerCase()
  const extension = getExtension(contentType)
  if (!extension) {
    return json(request, env, { error: 'UNSUPPORTED_IMAGE_TYPE' }, 415)
  }

  const maxUploadBytes = getMaxUploadBytes(env)
  if (file.size > maxUploadBytes) {
    return json(request, env, {
      error: 'FILE_TOO_LARGE',
      maxUploadBytes
    }, 413)
  }

  const bytes = await file.arrayBuffer()
  const hash = await sha256(bytes)
  const key = buildObjectKey(hash, extension)

  await env.IMAGES.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      originalName: file.name || '',
      sha256: hash
    }
  })

  const result: UploadResult = {
    url: buildPublicUrl(request, env, key),
    key,
    size: file.size,
    contentType
  }

  return json(request, env, result)
}

async function handleFile(request: Request, env: Env, key: string) {
  if (!key) return json(request, env, { error: 'MISSING_KEY' }, 400)

  const object = await env.IMAGES.get(key)
  if (!object) return json(request, env, { error: 'NOT_FOUND' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')

  return new Response(request.method === 'HEAD' ? null : object.body, {
    status: 200,
    headers
  })
}

function safePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

function articleLatestKey(articleId: string) {
  return `articles/global/${articleId}/latest.json`
}

function legacyArticleLatestKey(deviceId: string, articleId: string) {
  return `articles/${deviceId}/${articleId}/latest.json`
}

function articleIndexKey() {
  return 'articles/index.json'
}

function getWordCount(content: string) {
  return content.replace(/\s+/g, '').length
}

async function readArticleBackup(object: R2ObjectBody | null): Promise<ArticleBackup | null> {
  if (!object) return null

  try {
    return await object.json<ArticleBackup>()
  } catch {
    return null
  }
}

async function findLegacyArticleBackup(env: Env, articleId: string) {
  let cursor: string | undefined
  let latestBackup: ArticleBackup | null = null

  do {
    const result = await env.IMAGES.list({
      prefix: 'articles/',
      cursor,
      limit: 1000
    })

    for (const object of result.objects) {
      if (
        !object.key.endsWith(`/${articleId}/latest.json`)
        || object.key.startsWith('articles/global/')
      ) {
        continue
      }

      const backup = await readArticleBackup(await env.IMAGES.get(object.key))
      if (!backup) continue

      if (!latestBackup || backup.updatedAt.localeCompare(latestBackup.updatedAt) > 0) {
        latestBackup = backup
      }
    }

    cursor = result.truncated ? result.cursor : undefined
  } while (cursor)

  return latestBackup
}

async function readArticleIndex(env: Env): Promise<ArticleIndexEntry[]> {
  const object = await env.IMAGES.get(articleIndexKey())
  if (!object) return []

  try {
    const payload = await object.json<{ articles?: ArticleIndexEntry[] }>()
    return Array.isArray(payload.articles) ? payload.articles : []
  } catch {
    return []
  }
}

async function writeArticleIndex(env: Env, articles: ArticleIndexEntry[]) {
  await env.IMAGES.put(articleIndexKey(), JSON.stringify({ articles }), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8'
    }
  })
}

async function upsertArticleIndex(env: Env, backup: ArticleBackup) {
  const articles = await readArticleIndex(env)
  const entry: ArticleIndexEntry = {
    id: backup.id,
    title: backup.title,
    source: backup.source,
    mode: backup.mode,
    deviceId: backup.deviceId,
    wordCount: backup.wordCount,
    createdAt: backup.createdAt,
    updatedAt: backup.updatedAt
  }
  const nextArticles = [
    entry,
    ...articles.filter(article => article.id !== backup.id)
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  await writeArticleIndex(env, nextArticles)
  return nextArticles
}

async function deleteArticleIndex(env: Env, articleId: string) {
  const articles = await readArticleIndex(env)
  const nextArticles = articles.filter(article => article.id !== articleId)

  if (nextArticles.length !== articles.length) {
    await writeArticleIndex(env, nextArticles)
  }

  return nextArticles
}

async function readArticlePayload(request: Request): Promise<ArticleBackupPayload | null> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_ARTICLE_BYTES) {
    throw new Error('ARTICLE_TOO_LARGE')
  }

  try {
    return JSON.parse(raw) as ArticleBackupPayload
  } catch {
    return null
  }
}

async function handleCreateArticleBackup(request: Request, env: Env, articleId: string, deviceIdFromPath = '') {
  const accessError = requireApiAccess(request, env)
  if (accessError) return accessError

  let payload: ArticleBackupPayload | null = null
  try {
    payload = await readArticlePayload(request)
  } catch (error) {
    if (error instanceof Error && error.message === 'ARTICLE_TOO_LARGE') {
      return json(request, env, { error: 'ARTICLE_TOO_LARGE', maxArticleBytes: MAX_ARTICLE_BYTES }, 413)
    }

    throw error
  }

  if (!payload || typeof payload.content !== 'string') {
    return json(request, env, { error: 'INVALID_ARTICLE_PAYLOAD' }, 400)
  }

  const deviceId = safePathSegment(payload.deviceId || deviceIdFromPath || 'unknown')
  const latestKey = articleLatestKey(articleId)
  const latest = await readArticleBackup(await env.IMAGES.get(latestKey))
  const now = new Date()
  const updatedAt = now.toISOString()
  const title = (payload.title || '未命名文章').trim().slice(0, 120) || '未命名文章'
  const content = payload.content

  const backup: ArticleBackup = {
    id: articleId,
    title,
    content,
    source: payload.source || 'wechat',
    mode: payload.mode || 'manual',
    deviceId,
    wordCount: getWordCount(content),
    createdAt: latest?.createdAt || payload.clientUpdatedAt || updatedAt,
    updatedAt
  }

  const body = JSON.stringify(backup)
  const metadata = {
    title,
    articleId,
    mode: backup.mode,
    deviceId,
    wordCount: String(backup.wordCount),
    updatedAt
  }

  const writes = [
    env.IMAGES.put(latestKey, body, {
      httpMetadata: {
        contentType: 'application/json; charset=utf-8'
      },
      customMetadata: metadata
    }),
    upsertArticleIndex(env, backup)
  ]

  if (deviceIdFromPath) {
    writes.push(env.IMAGES.put(legacyArticleLatestKey(deviceIdFromPath, articleId), body, {
      httpMetadata: {
        contentType: 'application/json; charset=utf-8'
      },
      customMetadata: metadata
    }))
  }

  await Promise.all(writes)

  return json(request, env, {
    article: {
      id: backup.id,
      title: backup.title,
      wordCount: backup.wordCount,
      updatedAt: backup.updatedAt
    }
  })
}

async function handleGetLatestArticle(request: Request, env: Env, articleId: string, deviceIdFromPath = '') {
  const accessError = requireApiAccess(request, env)
  if (accessError) return accessError

  const globalBackup = await readArticleBackup(await env.IMAGES.get(articleLatestKey(articleId)))
  const legacyBackup = deviceIdFromPath
    ? await readArticleBackup(await env.IMAGES.get(legacyArticleLatestKey(deviceIdFromPath, articleId)))
    : await findLegacyArticleBackup(env, articleId)
  const backup = [globalBackup, legacyBackup]
    .filter((article): article is ArticleBackup => Boolean(article))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  if (!backup) return json(request, env, { error: 'ARTICLE_NOT_FOUND' }, 404)

  return json(request, env, { article: backup })
}

async function handleDeleteArticle(request: Request, env: Env, articleId: string, deviceIdFromPath = '') {
  const accessError = requireApiAccess(request, env)
  if (accessError) return accessError

  const keysToDelete = new Set<string>([articleLatestKey(articleId)])

  if (deviceIdFromPath) {
    keysToDelete.add(legacyArticleLatestKey(deviceIdFromPath, articleId))
  } else {
    let cursor: string | undefined

    do {
      const result = await env.IMAGES.list({
        prefix: 'articles/',
        cursor,
        limit: 1000
      })

      for (const object of result.objects) {
        if (
          object.key.endsWith(`/${articleId}/latest.json`)
          && !object.key.startsWith('articles/global/')
        ) {
          keysToDelete.add(object.key)
        }
      }

      cursor = result.truncated ? result.cursor : undefined
    } while (cursor)
  }

  await Promise.all([
    ...[...keysToDelete].map(key => env.IMAGES.delete(key)),
    deleteArticleIndex(env, articleId)
  ])

  return json(request, env, {
    deleted: true,
    article: {
      id: articleId
    }
  })
}

async function listLegacyArticleBackups(env: Env) {
  const articles: ArticleIndexEntry[] = []
  let cursor: string | undefined

  do {
    const result = await env.IMAGES.list({
      prefix: 'articles/',
      cursor,
      limit: 1000
    })

    for (const object of result.objects) {
      if (!object.key.endsWith('/latest.json') || object.key.startsWith('articles/global/')) {
        continue
      }

      const parts = object.key.split('/')
      const deviceId = parts[1] || ''
      const articleId = parts[2] || ''
      if (!deviceId || !articleId) continue

      const backup = await readArticleBackup(await env.IMAGES.get(object.key))
      if (!backup) continue

      articles.push({
        id: backup.id || articleId,
        title: backup.title,
        source: backup.source,
        mode: backup.mode,
        deviceId: backup.deviceId || deviceId,
        wordCount: backup.wordCount,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt
      })
    }

    cursor = result.truncated ? result.cursor : undefined
  } while (cursor)

  return articles
}

async function handleListArticles(request: Request, env: Env) {
  const accessError = requireApiAccess(request, env)
  if (accessError) return accessError

  const indexedArticles = await readArticleIndex(env)
  const legacyArticles = await listLegacyArticleBackups(env)
  const articleMap = new Map<string, ArticleIndexEntry>()

  for (const article of [...legacyArticles, ...indexedArticles]) {
    const existing = articleMap.get(article.id)
    if (!existing || article.updatedAt.localeCompare(existing.updatedAt) > 0) {
      articleMap.set(article.id, article)
    }
  }

  const articles = [...articleMap.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return json(request, env, { articles })
}

function getArticleRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'articles') return null

  if (parts.length === 1) {
    return {
      kind: 'list' as const
    }
  }

  if (parts.length <= 3 && (parts.length === 2 || parts[2] === 'latest')) {
    const articleId = safePathSegment(parts[1] || '')
    if (!articleId) return null

    return {
      kind: 'article' as const,
      articleId,
      action: parts[2] || ''
    }
  }

  const deviceId = safePathSegment(parts[1] || '')
  const articleId = safePathSegment(parts[2] || '')
  const action = parts[3] || ''
  if (!deviceId || !articleId) return null

  return {
    kind: 'legacyArticle' as const,
    deviceId,
    articleId,
    action
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      })
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env)
    }

    if (url.pathname.startsWith('/file/') && (request.method === 'GET' || request.method === 'HEAD')) {
      return handleFile(request, env, decodeURIComponent(url.pathname.slice('/file/'.length)))
    }

    const articleRoute = getArticleRoute(url.pathname)
    if (articleRoute) {
      if (articleRoute.kind === 'list' && request.method === 'GET') {
        return handleListArticles(request, env)
      }

      if (articleRoute.kind === 'article') {
        const { articleId, action } = articleRoute

        if (!action && request.method === 'POST') {
          return handleCreateArticleBackup(request, env, articleId)
        }

        if (action === 'latest' && request.method === 'GET') {
          return handleGetLatestArticle(request, env, articleId)
        }

        if (!action && request.method === 'DELETE') {
          return handleDeleteArticle(request, env, articleId)
        }
      }

      if (articleRoute.kind === 'legacyArticle') {
        const { deviceId, articleId, action } = articleRoute

        if (!action && request.method === 'POST') {
          return handleCreateArticleBackup(request, env, articleId, deviceId)
        }

        if (action === 'latest' && request.method === 'GET') {
          return handleGetLatestArticle(request, env, articleId, deviceId)
        }

        if (!action && request.method === 'DELETE') {
          return handleDeleteArticle(request, env, articleId, deviceId)
        }
      }
    }

    return json(request, env, { error: 'NOT_FOUND' }, 404)
  }
}
