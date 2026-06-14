'use client'

import { Archive, Copy, Loader2, Settings, Smartphone, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'
import { Logo } from '@/components/icons/Logo'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { ArticleBackupDialog } from './ArticleBackupDialog'
import { ImageUploadSettingsDialog } from './ImageUploadSettingsDialog'
import { type LocalArticleBackupStatus } from '@/lib/local-articles'

interface EditorToolbarProps {
  value: string
  isDraft: boolean
  showPreview: boolean
  onCopyPreview: () => Promise<boolean>
  onNewArticle: () => void
  onArticleSelect: (article: { id?: string; content: string, template: string }) => void
  onPreviewToggle: () => void
  onClear: () => void
  imageUploadSettingsOpen: boolean
  onImageUploadSettingsOpenChange: (open: boolean) => void
  articleBackupOpen: boolean
  onArticleBackupOpenChange: (open: boolean) => void
  articleId: string
  autoBackupEnabled: boolean
  lastBackupAt: string
  backupStatus: LocalArticleBackupStatus
  onAutoBackupChange: (enabled: boolean) => void
  onLastBackupAtChange: (value: string) => void
  onRestoreBackup: (content: string) => void
}

function getBackupButtonState(status: LocalArticleBackupStatus) {
  if (status === 'backed_up') {
    return {
      label: '已备份',
      icon: <Archive className="h-4 w-4" />,
      className: 'bg-muted text-muted-foreground hover:bg-muted/90'
    }
  }

  if (status === 'backing_up') {
    return {
      label: '备份中',
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      className: 'bg-primary text-primary-foreground hover:bg-primary/90'
    }
  }

  if (status === 'failed') {
    return {
      label: '备份失败',
      icon: <Archive className="h-4 w-4" />,
      className: 'bg-primary text-primary-foreground hover:bg-primary/90'
    }
  }

  return {
    label: '未备份',
    icon: <Archive className="h-4 w-4" />,
    className: 'bg-primary text-primary-foreground hover:bg-primary/90'
  }
}

export function EditorToolbar({
  value,
  isDraft,
  showPreview,
  onCopyPreview,
  onNewArticle,
  onArticleSelect,
  onPreviewToggle,
  onClear,
  imageUploadSettingsOpen,
  onImageUploadSettingsOpenChange,
  articleBackupOpen,
  onArticleBackupOpenChange,
  articleId,
  autoBackupEnabled,
  lastBackupAt,
  backupStatus,
  onAutoBackupChange,
  onLastBackupAtChange,
  onRestoreBackup
}: EditorToolbarProps) {
  const { toast } = useToast()
  const backupButtonState = getBackupButtonState(backupStatus)

  const handleCopyPreview = async () => {
    try {
      const result = await onCopyPreview()
      if (result) {
        toast({
          title: '复制成功',
          description: '已复制预览内容',
          duration: 2000
        })
      } else {
        toast({
          variant: 'destructive',
          title: '复制失败',
          description: '无法访问剪贴板，请检查浏览器权限',
          action: <ToastAction altText="重试">重试</ToastAction>
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '复制失败',
        description: '发生错误，请重试',
        action: <ToastAction altText="重试">重试</ToastAction>
      })
    }
  }

  return (
    <div className="flex-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      <div className="px-4">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-primary hidden sm:flex items-center gap-2">
                <Logo className="w-6 h-6" />
                NeuraPress
              </Link>
              <div className="hidden sm:block">
                <ArticleList
                  onSelect={onArticleSelect}
                  onNew={onNewArticle}
                  onOpenSettings={() => onImageUploadSettingsOpenChange(true)}
                  onArticleBackupComplete={(localArticleId, updatedAt) => {
                    if (articleId === `local_${localArticleId}`) {
                      onLastBackupAtChange(updatedAt)
                    }
                  }}
                />
              </div>
              <button
                onClick={onPreviewToggle}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors justify-center hidden sm:inline-flex',
                  showPreview
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground hover:bg-muted/90'
                )}
              >
                <Smartphone className="h-4 w-4" />
                {showPreview ? '编辑' : '预览'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {isDraft ? '自动保存中' : '已自动保存'}
              </span>
              <button
                onClick={() => onImageUploadSettingsOpenChange(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/90 text-sm transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">设置</span>
              </button>
              <button
                onClick={() => onArticleBackupOpenChange(true)}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  backupButtonState.className
                )}
              >
                {backupButtonState.icon}
                <span className="hidden sm:inline">{backupButtonState.label}</span>
              </button>
              <button
                onClick={onClear}
                className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>清除</span>
              </button>
              <button
                onClick={handleCopyPreview}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>复制</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <ImageUploadSettingsDialog
        open={imageUploadSettingsOpen}
        onOpenChange={onImageUploadSettingsOpenChange}
      />
      <ArticleBackupDialog
        open={articleBackupOpen}
        onOpenChange={onArticleBackupOpenChange}
        articleId={articleId}
        content={value}
        autoBackupEnabled={autoBackupEnabled}
        lastBackupAt={lastBackupAt}
        backupStatus={backupStatus}
        onAutoBackupChange={onAutoBackupChange}
        onLastBackupAtChange={onLastBackupAtChange}
        onRestore={onRestoreBackup}
        onOpenSettings={() => onImageUploadSettingsOpenChange(true)}
      />
    </div>
  )
}
