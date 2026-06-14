'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import {
  clearStoredImageUploadToken,
  getImageUploadSettings
} from '@/lib/image-upload-settings'

type ImageUploadResult = {
  url: string
  key?: string
  size?: number
  contentType?: string
}

const MAX_CLIENT_UPLOAD_BYTES = 5 * 1024 * 1024

type ImageUploadErrorPayload = {
  error?: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '图片上传失败'
}

async function readJsonSafely(response: Response): Promise<(ImageUploadErrorPayload & Partial<ImageUploadResult>) | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

type UseImageUploadOptions = {
  onOpenSettings?: () => void
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { toast } = useToast()
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const { onOpenSettings } = options

  const uploadImage = useCallback(async (file: File): Promise<ImageUploadResult> => {
    const { endpoint, token } = getImageUploadSettings()
    if (!endpoint) {
      toast({
        variant: 'destructive',
        title: '需要配置图片上传',
        description: '请先在设置里填写 Worker 上传接口和上传密钥',
        duration: 3000
      })
      onOpenSettings?.()
      throw new Error('Image upload endpoint is not configured')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件')
    }

    if (file.size > MAX_CLIENT_UPLOAD_BYTES) {
      throw new Error('图片不能超过 5MB')
    }

    const formData = new FormData()
    formData.append('file', file)

    const sendUploadRequest = async (uploadToken: string) => {
      const headers: HeadersInit = uploadToken
        ? { authorization: `Bearer ${uploadToken}` }
        : {}

      return fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData
      })
    }

    setIsUploadingImage(true)
    try {
      const response = await sendUploadRequest(token)

      if (response.status === 401) {
        clearStoredImageUploadToken()
        onOpenSettings?.()
        throw new Error('上传密钥无效，请在设置中填写当前 Worker 的 UPLOAD_TOKEN')
      }

      const payload = await readJsonSafely(response)

      if (!response.ok) {
        const reason = payload?.error || `HTTP_${response.status}`
        if (response.status === 403) {
          onOpenSettings?.()
        }
        throw new Error(`图片上传失败：${reason}`)
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        throw new Error('图片上传响应缺少 URL')
      }

      return payload as ImageUploadResult
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '图片上传失败',
        description: getErrorMessage(error),
        duration: 3000
      })
      throw error
    } finally {
      setIsUploadingImage(false)
    }
  }, [onOpenSettings, toast])

  return {
    isUploadingImage,
    uploadImage
  }
}
