'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArchiveRestore,
  Cloud,
  CloudUpload,
  Loader2,
  Settings,
  TimerReset
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  getArticleBackupConfig,
  getArticleTitleFromMarkdown,
  getArticleWordCount,
  getLatestArticleBackup,
  getLastBackupAt,
  saveArticleBackup,
  setAutoBackupEnabled,
  type ArticleBackup
} from '@/lib/article-backup'
import { type LocalArticleBackupStatus } from '@/lib/local-articles'

interface ArticleBackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleId: string
  content: string
  autoBackupEnabled: boolean
  lastBackupAt: string
  backupStatus: LocalArticleBackupStatus
  onAutoBackupChange: (enabled: boolean) => void
  onLastBackupAtChange: (value: string) => void
  onRestore: (content: string) => void
  onOpenSettings: () => void
}

function formatDateTime(value: string) {
  if (!value) return '尚未备份'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getModeLabel(mode: string) {
  return mode === 'auto' ? '自动' : '手动'
}

function getBackupStatusLabel(status: LocalArticleBackupStatus) {
  if (status === 'backing_up') return '备份中'
  if (status === 'backed_up') return '已备份'
  if (status === 'failed') return '备份失败'
  return '未备份'
}

export function ArticleBackupDialog({
  open,
  onOpenChange,
  articleId,
  content,
  autoBackupEnabled,
  lastBackupAt,
  backupStatus,
  onAutoBackupChange,
  onLastBackupAtChange,
  onRestore,
  onOpenSettings
}: ArticleBackupDialogProps) {
  const { toast } = useToast()
  const [latestBackup, setLatestBackup] = useState<ArticleBackup | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const articleTitle = useMemo(() => getArticleTitleFromMarkdown(content), [content])
  const wordCount = useMemo(() => getArticleWordCount(content), [content])
  const hasBackupConfig = Boolean(getArticleBackupConfig().baseUrl && getArticleBackupConfig().token)

  const refreshBackups = async () => {
    if (!hasBackupConfig || !articleId) return

    try {
      const latestResult = await getLatestArticleBackup(articleId)
      setLatestBackup(latestResult.article)
    } catch {
      setLatestBackup(null)
    }
  }

  useEffect(() => {
    if (!open) return
    refreshBackups()
  }, [open, articleId, hasBackupConfig])

  const handleManualBackup = async () => {
    if (!content.trim()) {
      toast({
        variant: 'destructive',
        title: '没有可备份的内容',
        description: '当前文章为空',
        duration: 2500
      })
      return
    }

    if (!hasBackupConfig) {
      onOpenSettings()
      toast({
        variant: 'destructive',
        title: '需要配置上传服务',
        description: '请先填写 Worker 上传接口和上传密钥',
        duration: 2500
      })
      return
    }

    setIsBackingUp(true)
    try {
      const result = await saveArticleBackup({
        articleId,
        title: articleTitle,
        content,
        mode: 'manual'
      })

      onLastBackupAtChange(result.article.updatedAt)
      toast({
        title: '文章已备份',
        description: '已保存到 R2',
        duration: 2200
      })
      await refreshBackups()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '备份失败',
        description: error instanceof Error ? error.message : '请检查上传设置',
        duration: 3000
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async () => {
    if (!hasBackupConfig) {
      onOpenSettings()
      return
    }

    if (!window.confirm('确定要用云端备份覆盖当前编辑区内容吗？')) {
      return
    }

    setIsRestoring(true)
    try {
      const result = await getLatestArticleBackup(articleId)

      onRestore(result.article.content)
      toast({
        title: '已恢复云端备份',
        description: result.article.title,
        duration: 2500
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '恢复失败',
        description: error instanceof Error ? error.message : '没有找到可恢复的备份',
        duration: 3000
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const handleAutoBackupChange = (enabled: boolean) => {
    setAutoBackupEnabled(enabled)
    onAutoBackupChange(enabled)
    toast({
      title: enabled ? '已开启自动备份' : '已关闭自动备份',
      description: enabled ? '编辑停顿约 30 秒后会自动备份' : '之后只会手动备份',
      duration: 2200
    })
  }

  const visibleLastBackupAt = lastBackupAt || getLastBackupAt()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            文章备份
          </DialogTitle>
          <DialogDescription>
            将当前 Markdown 文章备份到你的 Cloudflare R2，并可从云端恢复。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4 rounded-md border p-4">
            <div>
              <div className="text-sm text-muted-foreground">当前文章</div>
              <div className="mt-1 line-clamp-2 text-base font-semibold">{articleTitle}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">字数</div>
                <div className="mt-1 font-medium">{wordCount}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">备份状态</div>
                <div className="mt-1 font-medium">{getBackupStatusLabel(backupStatus)}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">最近备份</div>
                <div className="mt-1 font-medium">{formatDateTime(visibleLastBackupAt)}</div>
              </div>
            </div>

            {!hasBackupConfig && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <div className="mb-2 font-medium text-foreground">需要先配置 Worker</div>
                文章备份复用图片上传设置里的 Worker 地址和上传密钥。
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  打开设置
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleManualBackup} disabled={isBackingUp || !content.trim()}>
                {isBackingUp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                备份当前文章
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRestore}
                disabled={!latestBackup || isRestoring}
              >
                {isRestoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                )}
                恢复云端备份
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-md border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="auto-backup">自动备份</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  编辑停顿约 30 秒后同步到云端。
                </div>
              </div>
              <input
                id="auto-backup"
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={event => handleAutoBackupChange(event.target.checked)}
                className="mt-1 h-5 w-5 accent-primary"
              />
            </div>

            <div className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <TimerReset className="h-4 w-4" />
                备份节奏
              </div>
              自动备份会避开连续输入，不会每敲一个字就上传。
            </div>

            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 font-medium">云端备份</div>
              <div className="space-y-1 text-muted-foreground">
                <div>{latestBackup ? formatDateTime(latestBackup.updatedAt) : '尚未备份'}</div>
                {latestBackup && <div>{getModeLabel(latestBackup.mode)}备份</div>}
              </div>
            </div>
          </section>
        </div>

      </DialogContent>
    </Dialog>
  )
}
