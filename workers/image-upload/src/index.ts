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

type UploadedFile = {
  name?: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024

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
    'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
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
  if (!isOriginAllowed(request.headers.get('origin'), env)) {
    return json(request, env, { error: 'ORIGIN_NOT_ALLOWED' }, 403)
  }

  if (!isAuthorized(request, env)) {
    return unauthorized(request, env)
  }

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

    return json(request, env, { error: 'NOT_FOUND' }, 404)
  }
}
