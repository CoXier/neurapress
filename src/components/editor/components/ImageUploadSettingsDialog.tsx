'use client'

import { useEffect, useState } from 'react'
import { CloudUpload, KeyRound, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  clearImageUploadSettings,
  getDefaultImageUploadEndpoint,
  getImageUploadSettings,
  normalizeImageUploadEndpoint,
  saveImageUploadSettings
} from '@/lib/image-upload-settings'

interface ImageUploadSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageUploadSettingsDialog({
  open,
  onOpenChange
}: ImageUploadSettingsDialogProps) {
  const { toast } = useToast()
  const [endpoint, setEndpoint] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!open) return

    const settings = getImageUploadSettings()
    setEndpoint(settings.endpoint)
    setToken(settings.token)
  }, [open])

  const handleSave = () => {
    const normalizedEndpoint = normalizeImageUploadEndpoint(endpoint)

    if (!normalizedEndpoint) {
      toast({
        variant: 'destructive',
        title: '缺少上传接口',
        description: '请填写 Worker 的 /upload 地址',
        duration: 2500
      })
      return
    }

    saveImageUploadSettings({
      endpoint: normalizedEndpoint,
      token
    })

    setEndpoint(normalizedEndpoint)
    toast({
      title: '图片上传设置已保存',
      description: '配置只保存在当前浏览器',
      duration: 2000
    })
    onOpenChange(false)
  }

  const handleClear = () => {
    clearImageUploadSettings()
    setEndpoint(getDefaultImageUploadEndpoint())
    setToken('')
    toast({
      title: '已清除本地图片上传设置',
      description: '上传密钥已从当前浏览器移除',
      duration: 2000
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            图片上传设置
          </DialogTitle>
          <DialogDescription>
            使用你自己的 Cloudflare Worker 和 R2 存储图片，上传密钥只保存在当前浏览器。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-upload-endpoint">上传接口</Label>
              <Input
                id="image-upload-endpoint"
                value={endpoint}
                onChange={event => setEndpoint(event.target.value)}
                placeholder="https://your-worker.your-subdomain.workers.dev/upload"
                spellCheck={false}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                需要填写 Worker 的完整上传地址，通常以 <code className="rounded bg-muted px-1 py-0.5">/upload</code> 结尾。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload-token">上传密钥</Label>
              <Input
                id="image-upload-token"
                value={token}
                onChange={event => setToken(event.target.value)}
                placeholder="Cloudflare Worker Secret: UPLOAD_TOKEN"
                type="password"
                spellCheck={false}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                这里填写 Cloudflare Worker 里的 <code className="rounded bg-muted px-1 py-0.5">UPLOAD_TOKEN</code> 值，不会提交到 GitHub。
              </p>
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              如何创建自己的上传服务
            </div>
            <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>
                <span className="mr-2 font-medium text-foreground">1.</span>
                在 Cloudflare Dashboard 启用 R2，并创建 bucket：<code className="rounded bg-muted px-1 py-0.5">neurapress-images</code>。
              </li>
              <li>
                <span className="mr-2 font-medium text-foreground">2.</span>
                部署本项目里的 Worker：<code className="rounded bg-muted px-1 py-0.5">workers/image-upload</code>。
              </li>
              <li>
                <span className="mr-2 font-medium text-foreground">3.</span>
                给 Worker 设置 Secret：<code className="rounded bg-muted px-1 py-0.5">UPLOAD_TOKEN</code>。
              </li>
              <li>
                <span className="mr-2 font-medium text-foreground">4.</span>
                确认 <code className="rounded bg-muted px-1 py-0.5">ALLOWED_ORIGINS</code> 包含当前网站地址，然后把 Worker 的 <code className="rounded bg-muted px-1 py-0.5">/upload</code> 地址和密钥填到这里。
              </li>
            </ol>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <KeyRound className="h-4 w-4" />
              权限说明
            </div>
            公开网站只会暴露上传接口地址。没有上传密钥的人无法写入你的 R2；每个用户也可以在这里换成自己的 Worker 和 token。
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClear}>
            <RotateCcw className="mr-2 h-4 w-4" />
            清除
          </Button>
          <Button type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
