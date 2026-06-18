import { getArticleTitleFromMarkdown, type ArticleBackup } from './article-backup'

export type LocalArticleBackupStatus = 'not_backed_up' | 'backing_up' | 'backed_up' | 'failed'

export type LocalArticle = {
  id: string
  title: string
  content: string
  template: string
  createdAt: number
  updatedAt: number
  cloudArticleId?: string
  backupStatus?: LocalArticleBackupStatus
  backedUpAt?: string
  backupError?: string
}

export const ARTICLES_STORAGE_KEY = 'wechat_articles'
export const ARTICLES_UPDATED_EVENT = 'wechat_articles_updated'
const CURRENT_LOCAL_ARTICLE_ID_STORAGE_KEY = 'wechat_current_local_article_id'
const DELETED_CLOUD_ARTICLES_STORAGE_KEY = 'wechat_deleted_cloud_articles'
const MAX_DELETED_CLOUD_ARTICLES = 500

type DeletedCloudArticle = {
  id: string
  deletedAt: number
}

export function getCloudArticleId(localArticleId: string) {
  return `local_${localArticleId}`
}

export function getArticleCloudId(article: Pick<LocalArticle, 'id' | 'cloudArticleId'>) {
  return article.cloudArticleId || getCloudArticleId(article.id)
}

function isSameCloudArticle(article: Pick<LocalArticle, 'id' | 'cloudArticleId'>, cloudArticleId: string) {
  return getArticleCloudId(article) === cloudArticleId
}

function loadDeletedCloudArticles(): DeletedCloudArticle[] {
  if (typeof window === 'undefined') return []

  try {
    const savedArticles = localStorage.getItem(DELETED_CLOUD_ARTICLES_STORAGE_KEY)
    if (!savedArticles) return []

    const parsed = JSON.parse(savedArticles)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((article): article is DeletedCloudArticle => {
      return typeof article?.id === 'string' && typeof article?.deletedAt === 'number'
    })
  } catch {
    return []
  }
}

function saveDeletedCloudArticles(articles: DeletedCloudArticle[]) {
  if (typeof window === 'undefined') return

  localStorage.setItem(
    DELETED_CLOUD_ARTICLES_STORAGE_KEY,
    JSON.stringify(articles.slice(0, MAX_DELETED_CLOUD_ARTICLES))
  )
}

export function rememberDeletedCloudArticleId(cloudArticleId: string) {
  if (!cloudArticleId) return

  const articles = loadDeletedCloudArticles()
  saveDeletedCloudArticles([
    { id: cloudArticleId, deletedAt: Date.now() },
    ...articles.filter(article => article.id !== cloudArticleId)
  ])
}

export function forgetDeletedCloudArticleId(cloudArticleId: string) {
  if (!cloudArticleId) return

  const articles = loadDeletedCloudArticles()
  saveDeletedCloudArticles(articles.filter(article => article.id !== cloudArticleId))
}

export function isDeletedCloudArticle(cloudArticleId: string) {
  return loadDeletedCloudArticles().some(article => article.id === cloudArticleId)
}

export function loadLocalArticles(): LocalArticle[] {
  if (typeof window === 'undefined') return []

  try {
    const savedArticles = localStorage.getItem(ARTICLES_STORAGE_KEY)
    if (!savedArticles) return []

    const parsed = JSON.parse(savedArticles)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to parse saved articles:', error)
    return []
  }
}

export function saveLocalArticles(articles: LocalArticle[]) {
  localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(articles))
  window.dispatchEvent(new CustomEvent(ARTICLES_UPDATED_EVENT, {
    detail: articles
  }))
}

export function getCurrentLocalArticleId() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(CURRENT_LOCAL_ARTICLE_ID_STORAGE_KEY) || ''
}

export function setCurrentLocalArticleId(articleId: string) {
  if (typeof window === 'undefined') return

  if (articleId) {
    localStorage.setItem(CURRENT_LOCAL_ARTICLE_ID_STORAGE_KEY, articleId)
  } else {
    localStorage.removeItem(CURRENT_LOCAL_ARTICLE_ID_STORAGE_KEY)
  }
}

export function createLocalArticleId() {
  return Date.now().toString()
}

function createUniqueLocalArticleId(articles: LocalArticle[]) {
  let id = createLocalArticleId()
  while (articles.some(article => article.id === id)) {
    id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
  return id
}

function parseDate(value: string, fallback: number) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? fallback : time
}

export function upsertLocalArticleContent({
  id,
  content,
  template = 'default',
  cloudArticleId
}: {
  id?: string
  content: string
  template?: string
  cloudArticleId?: string
}) {
  const now = Date.now()
  const articles = loadLocalArticles()
  const title = getArticleTitleFromMarkdown(content)
  const existingArticle = id ? articles.find(article => article.id === id) : null
  const articleId = existingArticle?.id || id || createLocalArticleId()

  const nextArticle: LocalArticle = existingArticle
    ? {
        ...existingArticle,
        title,
        content,
        template,
        cloudArticleId: cloudArticleId || existingArticle.cloudArticleId,
        updatedAt: now,
        backupStatus: existingArticle.content === content
          ? existingArticle.backupStatus || 'not_backed_up'
          : 'not_backed_up',
        backupError: existingArticle.content === content
          ? existingArticle.backupError
          : ''
      }
    : {
        id: articleId,
        title,
        content,
        template,
        cloudArticleId: cloudArticleId || getCloudArticleId(articleId),
        createdAt: now,
        updatedAt: now,
        backupStatus: 'not_backed_up'
      }

  const nextArticles = existingArticle
    ? articles.map(article => article.id === articleId ? nextArticle : article)
    : [nextArticle, ...articles]

  saveLocalArticles(nextArticles)
  return nextArticle
}

export function updateLocalArticleBackupStatus(
  articleId: string,
  status: LocalArticleBackupStatus,
  extra: Partial<Pick<LocalArticle, 'backedUpAt' | 'backupError' | 'cloudArticleId'>> = {}
) {
  const articles = loadLocalArticles()
  const nextArticles = articles.map(article => article.id === articleId
    ? {
        ...article,
        backupStatus: status,
        ...extra
      }
    : article
  )

  saveLocalArticles(nextArticles)
  return nextArticles
}

export function mergeCloudArticleBackups(cloudArticles: ArticleBackup[]) {
  const articles = loadLocalArticles()
  const now = Date.now()
  let addedCount = 0
  let updatedCount = 0
  let skippedCount = 0

  const nextArticles = [...articles]

  for (const cloudArticle of cloudArticles) {
    if (isDeletedCloudArticle(cloudArticle.id)) {
      skippedCount += 1
      continue
    }

    const existingIndex = nextArticles.findIndex(article => isSameCloudArticle(article, cloudArticle.id))
    const cloudUpdatedAt = parseDate(cloudArticle.updatedAt, now)
    const cloudCreatedAt = parseDate(cloudArticle.createdAt, cloudUpdatedAt)

    if (existingIndex === -1) {
      nextArticles.unshift({
        id: createUniqueLocalArticleId(nextArticles),
        title: cloudArticle.title,
        content: cloudArticle.content,
        template: 'default',
        cloudArticleId: cloudArticle.id,
        createdAt: cloudCreatedAt,
        updatedAt: cloudUpdatedAt,
        backupStatus: 'backed_up',
        backedUpAt: cloudArticle.updatedAt,
        backupError: ''
      })
      addedCount += 1
      continue
    }

    const existingArticle = nextArticles[existingIndex]
    const existingBackedUpAt = existingArticle.backedUpAt || ''
    const isCloudNewer = cloudArticle.updatedAt.localeCompare(existingBackedUpAt) > 0
    const hasLocalChanges = getBackupStatus(existingArticle) !== 'backed_up'

    if (!isCloudNewer) {
      nextArticles[existingIndex] = {
        ...existingArticle,
        cloudArticleId: cloudArticle.id
      }
      skippedCount += 1
      continue
    }

    if (hasLocalChanges) {
      nextArticles[existingIndex] = {
        ...existingArticle,
        cloudArticleId: cloudArticle.id
      }
      skippedCount += 1
      continue
    }

    nextArticles[existingIndex] = {
      ...existingArticle,
      title: cloudArticle.title,
      content: cloudArticle.content,
      cloudArticleId: cloudArticle.id,
      updatedAt: cloudUpdatedAt,
      backupStatus: 'backed_up',
      backedUpAt: cloudArticle.updatedAt,
      backupError: ''
    }
    updatedCount += 1
  }

  nextArticles.sort((a, b) => b.updatedAt - a.updatedAt)
  saveLocalArticles(nextArticles)

  return {
    articles: nextArticles,
    addedCount,
    updatedCount,
    skippedCount
  }
}

function getBackupStatus(article: LocalArticle): LocalArticleBackupStatus {
  return article.backupStatus || 'not_backed_up'
}
