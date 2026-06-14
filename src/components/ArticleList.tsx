'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  Edit2,
  FileText,
  Loader2,
  Menu,
  Plus,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import {
  getArticleBackupConfig,
  saveArticleBackup
} from '@/lib/article-backup'
import {
  ARTICLES_UPDATED_EVENT,
  getCloudArticleId,
  loadLocalArticles,
  type LocalArticle,
  type LocalArticleBackupStatus,
  updateLocalArticleBackupStatus,
  saveLocalArticles
} from '@/lib/local-articles'

interface ArticleListProps {
  onSelect: (article: LocalArticle) => void
  onNew?: () => void
  onOpenSettings?: () => void
  onArticleBackupComplete?: (articleId: string, updatedAt: string) => void
}

function getBackupStatus(article: LocalArticle): LocalArticleBackupStatus {
  return article.backupStatus || 'not_backed_up'
}

function BackupStatusBadge({ article }: { article: LocalArticle }) {
  const status = getBackupStatus(article)

  if (status === 'backing_up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        备份中
      </span>
    )
  }

  if (status === 'backed_up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        已备份
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        备份失败
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <CloudOff className="h-3 w-3" />
      未备份
    </span>
  )
}

export function ArticleList({
  onSelect,
  onNew,
  onOpenSettings,
  onArticleBackupComplete
}: ArticleListProps) {
  const { toast } = useToast()
  const [articles, setArticles] = useState<LocalArticle[]>([])
  const [articleToDelete, setArticleToDelete] = useState<LocalArticle | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isBackingUpAll, setIsBackingUpAll] = useState(false)
  const allArticlesBackedUp = articles.length > 0 && articles.every(article => getBackupStatus(article) === 'backed_up')

  // 加载文章列表
  useEffect(() => {
    const syncArticles = () => setArticles(loadLocalArticles())

    syncArticles()
    window.addEventListener(ARTICLES_UPDATED_EVENT, syncArticles)
    return () => window.removeEventListener(ARTICLES_UPDATED_EVENT, syncArticles)
  }, [])

  const markBackupStatus = (
    articleId: string,
    status: LocalArticleBackupStatus,
    extra: Partial<Pick<LocalArticle, 'backedUpAt' | 'backupError'>> = {}
  ) => {
    const nextArticles = updateLocalArticleBackupStatus(articleId, status, extra)
    setArticles(nextArticles)
  }

  const backupAllArticles = async () => {
    if (articles.length === 0 || isBackingUpAll || allArticlesBackedUp) return

    const { baseUrl, token } = getArticleBackupConfig()
    if (!baseUrl || !token) {
      onOpenSettings?.()
      toast({
        variant: "destructive",
        title: "需要配置云端服务",
        description: "请先填写 Worker 上传接口和上传密钥",
        duration: 2500
      })
      return
    }

    setIsBackingUpAll(true)
    let successCount = 0
    let failedCount = 0

    for (const article of articles) {
      if (!article.content.trim()) continue

      markBackupStatus(article.id, 'backing_up', { backupError: '' })
      try {
        const result = await saveArticleBackup({
          articleId: getCloudArticleId(article.id),
          title: article.title,
          content: article.content,
          mode: 'manual'
        })

        successCount += 1
        markBackupStatus(article.id, 'backed_up', {
          backedUpAt: result.article.updatedAt,
          backupError: ''
        })
        onArticleBackupComplete?.(article.id, result.article.updatedAt)
      } catch (error) {
        failedCount += 1
        markBackupStatus(article.id, 'failed', {
          backupError: error instanceof Error ? error.message : '备份失败'
        })
      }
    }

    setIsBackingUpAll(false)
    toast({
      variant: failedCount > 0 ? "destructive" : "default",
      title: failedCount > 0 ? "部分文章备份失败" : "全部文章已备份",
      description: failedCount > 0
        ? `${successCount} 篇成功，${failedCount} 篇失败`
        : `${successCount} 篇文章已保存到 R2`,
      duration: 3000
    })
  }

  // 删除文章
  const deleteArticle = (article: LocalArticle) => {
    setArticleToDelete(article)
  }

  // 确认删除文章
  const confirmDelete = () => {
    if (!articleToDelete) return

    const updatedArticles = articles.filter(article => article.id !== articleToDelete.id)
    setArticles(updatedArticles)
    saveLocalArticles(updatedArticles)
    setArticleToDelete(null)

    toast({
      title: "删除成功",
      description: `文章"${articleToDelete.title}"已删除`,
      duration: 2000
    })
  }

  // 新建文章
  const createNewArticle = () => {
    // 如果有外部传入的新建处理函数，优先使用
    if (onNew) {
      onNew()
      setIsOpen(false)
      return
    }

    // 默认的新建文章处理
    const newArticle: LocalArticle = {
      id: Date.now().toString(),
      title: '新文章',
      content: `# 新文章

## 简介
在这里写文章的简介...

## 正文
开始写作你的精彩内容...

## 总结
在这里总结文章的主要观点...

---
> 作者：[你的名字]
> 日期：${new Date().toLocaleDateString()}
`,
      template: 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      backupStatus: 'not_backed_up'
    }

    // 保存新文章到本地存储
    const updatedArticles = [newArticle, ...articles]
    setArticles(updatedArticles)
    saveLocalArticles(updatedArticles)

    // 选中新文章并关闭列表
    onSelect(newArticle)
    setIsOpen(false)

    toast({
      title: "新建成功",
      description: "已创建新文章，开始写作吧！",
      duration: 2000
    })
  }

  // 开始重命名
  const startRename = (article: LocalArticle) => {
    setEditingId(article.id)
    setEditingTitle(article.title)
  }

  // 保存重命名
  const saveRename = (article: LocalArticle) => {
    if (!editingTitle.trim()) {
      toast({
        variant: "destructive",
        title: "重命名失败",
        description: "文章标题不能为空",
        duration: 2000
      })
      return
    }

    const updatedArticles = articles.map(a => {
      if (a.id === article.id) {
        return {
          ...a,
          title: editingTitle.trim(),
          updatedAt: Date.now(),
          backupStatus: 'not_backed_up' as LocalArticleBackupStatus,
          backupError: ''
        }
      }
      return a
    })

    setArticles(updatedArticles)
    saveLocalArticles(updatedArticles)
    setEditingId(null)
    setEditingTitle('')

    toast({
      title: "重命名成功",
      description: `文章已重命名为"${editingTitle.trim()}"`,
      duration: 2000
    })
  }

  // 取消重命名
  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Menu className="h-5 w-5" />
            <span className="sr-only">文章列表</span>
            {articles.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center">
                {articles.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>文章列表</SheetTitle>
            <SheetDescription className="flex gap-2">
              <Button onClick={createNewArticle} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                新建文章
              </Button>
              <Button
                onClick={backupAllArticles}
                className="flex-1"
                disabled={articles.length === 0 || isBackingUpAll || allArticlesBackedUp}
              >
                {isBackingUpAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : allArticlesBackedUp ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <CloudUpload className="h-4 w-4 mr-2" />
                )}
                {isBackingUpAll ? '备份中' : allArticlesBackedUp ? '全部已备份' : '一键备份'}
              </Button>
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            <div className="space-y-2">
              {articles.map(article => (
                <div
                  key={article.id}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2 rounded-md hover:bg-muted group"
                >
                  {editingId === article.id ? (
                    <div className="col-span-2 flex min-w-0 items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveRename(article)
                          } else if (e.key === 'Escape') {
                            cancelRename()
                          }
                        }}
                        className="h-8"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => saveRename(article)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelect(article)}
                        className="flex min-w-0 items-center gap-2 text-left"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{article.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{new Date(article.updatedAt).toLocaleString()}</span>
                            <BackupStatusBadge article={article} />
                          </div>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => startRename(article)}
                          title="重命名"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">重命名</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => deleteArticle(article)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">删除</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {articles.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  暂无保存的文章
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!articleToDelete} onOpenChange={() => setArticleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文章"{articleToDelete?.title}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
