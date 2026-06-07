'use client'

import { Copy, Save, Smartphone, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'
import { Logo } from '@/components/icons/Logo'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  value: string
  isDraft: boolean
  showPreview: boolean
  onSave: () => void
  onCopyPreview: () => Promise<boolean>
  onNewArticle: () => void
  onArticleSelect: (article: { content: string, template: string }) => void
  onPreviewToggle: () => void
  onClear: () => void
}

export function EditorToolbar({
  value,
  isDraft,
  showPreview,
  onSave,
  onCopyPreview,
  onNewArticle,
  onArticleSelect,
  onPreviewToggle,
  onClear
}: EditorToolbarProps) {
  const { toast } = useToast()

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
                  currentContent={value}
                  onNew={onNewArticle}
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
                {isDraft ? '未保存' : '已保存'}
              </span>
              <button
                onClick={onSave}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors hidden sm:inline-flex',
                  isDraft
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground hover:bg-muted/90'
                )}
              >
                <Save className="h-4 w-4" />
                <span>保存</span>
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
    </div>
  )
}
