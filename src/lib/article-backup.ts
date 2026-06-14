import {
  clearStoredImageUploadToken,
  getImageUploadSettings,
  getWorkerBaseUrl
} from './image-upload-settings'

export type ArticleBackupMode = 'manual' | 'auto'

export type ArticleBackup = {
  id: string
  title: string
  content: string
  source: string
  mode: ArticleBackupMode
  wordCount: number
  createdAt: string
  updatedAt: string
}

export type SaveArticleBackupResult = {
  article: Pick<ArticleBackup, 'id' | 'title' | 'wordCount' | 'updatedAt'>
}

const DEVICE_ID_STORAGE_KEY = 'neurapress_backup_device_id'
const CURRENT_ARTICLE_ID_STORAGE_KEY = 'neurapress_backup_current_article_id'
const AUTO_BACKUP_STORAGE_KEY = 'neurapress_backup_auto_enabled'
const LAST_BACKUP_AT_STORAGE_KEY = 'neurapress_backup_last_at'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '文章备份失败'
}

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function getStoredValue(key: string) {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) || ''
}

function setStoredValue(key: string, value: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, value)
}

export function getBackupDeviceId() {
  const stored = getStoredValue(DEVICE_ID_STORAGE_KEY)
  if (stored) return stored

  const deviceId = createLocalId('device')
  setStoredValue(DEVICE_ID_STORAGE_KEY, deviceId)
  return deviceId
}

export function getCurrentBackupArticleId() {
  const stored = getStoredValue(CURRENT_ARTICLE_ID_STORAGE_KEY)
  if (stored) return stored

  const articleId = createLocalId('article')
  setStoredValue(CURRENT_ARTICLE_ID_STORAGE_KEY, articleId)
  return articleId
}

export function setCurrentBackupArticleId(articleId: string) {
  setStoredValue(CURRENT_ARTICLE_ID_STORAGE_KEY, articleId)
}

export function createBackupArticleId() {
  const articleId = createLocalId('article')
  setCurrentBackupArticleId(articleId)
  return articleId
}

export function getAutoBackupEnabled() {
  return getStoredValue(AUTO_BACKUP_STORAGE_KEY) === 'true'
}

export function setAutoBackupEnabled(enabled: boolean) {
  setStoredValue(AUTO_BACKUP_STORAGE_KEY, String(enabled))
}

export function getLastBackupAt() {
  return getStoredValue(LAST_BACKUP_AT_STORAGE_KEY)
}

export function setLastBackupAt(value: string) {
  setStoredValue(LAST_BACKUP_AT_STORAGE_KEY, value)
}

export function getArticleTitleFromMarkdown(content: string) {
  const heading = content
    .split('\n')
    .map(line => line.trim())
    .find(line => /^#{1,6}\s+/.test(line))

  if (heading) {
    return heading.replace(/^#{1,6}\s+/, '').trim().slice(0, 120) || '未命名文章'
  }

  const firstTextLine = content
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)

  return firstTextLine?.slice(0, 120) || '未命名文章'
}

export function getArticleWordCount(content: string) {
  return content.replace(/\s+/g, '').length
}

export function getArticleBackupConfig() {
  const settings = getImageUploadSettings()
  const baseUrl = getWorkerBaseUrl(settings.endpoint)

  return {
    baseUrl,
    token: settings.token
  }
}

function getArticleUrl(articleId: string, path = '') {
  const { baseUrl } = getArticleBackupConfig()
  const deviceId = encodeURIComponent(getBackupDeviceId())
  const encodedArticleId = encodeURIComponent(articleId)

  if (!baseUrl) return ''
  return `${baseUrl}/articles/${deviceId}/${encodedArticleId}${path}`
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestArticleApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { token } = getArticleBackupConfig()

  if (!url) {
    throw new Error('请先在设置里填写 Worker 上传接口')
  }

  if (!token) {
    throw new Error('请先在设置里填写上传密钥')
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      authorization: `Bearer ${token}`
    }
  })
  const payload = await readJsonSafely(response)

  if (response.status === 401) {
    clearStoredImageUploadToken()
    throw new Error('上传密钥无效，请重新填写')
  }

  if (!response.ok) {
    const reason = payload?.error || `HTTP_${response.status}`
    throw new Error(`文章备份失败：${reason}`)
  }

  return payload as T
}

export async function saveArticleBackup({
  articleId,
  title,
  content,
  mode
}: {
  articleId: string
  title: string
  content: string
  mode: ArticleBackupMode
}) {
  try {
    const url = getArticleUrl(articleId)
    const result = await requestArticleApi<SaveArticleBackupResult>(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,
        mode,
        source: 'wechat',
        clientUpdatedAt: new Date().toISOString()
      })
    })

    setLastBackupAt(result.article.updatedAt)
    return result
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getLatestArticleBackup(articleId: string) {
  const url = getArticleUrl(articleId, '/latest')
  return requestArticleApi<{ article: ArticleBackup }>(url)
}
