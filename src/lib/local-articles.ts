import { getArticleTitleFromMarkdown } from './article-backup'

export type LocalArticleBackupStatus = 'not_backed_up' | 'backing_up' | 'backed_up' | 'failed'

export type LocalArticle = {
  id: string
  title: string
  content: string
  template: string
  createdAt: number
  updatedAt: number
  backupStatus?: LocalArticleBackupStatus
  backedUpAt?: string
  backupError?: string
}

export const ARTICLES_STORAGE_KEY = 'wechat_articles'
export const ARTICLES_UPDATED_EVENT = 'wechat_articles_updated'

export function getCloudArticleId(localArticleId: string) {
  return `local_${localArticleId}`
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

export function createLocalArticleId() {
  return Date.now().toString()
}

export function upsertLocalArticleContent({
  id,
  content,
  template = 'default'
}: {
  id?: string
  content: string
  template?: string
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
  extra: Partial<Pick<LocalArticle, 'backedUpAt' | 'backupError'>> = {}
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
