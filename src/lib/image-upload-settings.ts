export type ImageUploadSettings = {
  endpoint: string
  token: string
}

const ENDPOINT_STORAGE_KEY = 'neurapress_image_upload_endpoint'
const TOKEN_STORAGE_KEY = 'neurapress_image_upload_token'

export function getDefaultImageUploadEndpoint() {
  return process.env.NEXT_PUBLIC_IMAGE_UPLOAD_ENDPOINT?.trim() || ''
}

export function normalizeImageUploadEndpoint(endpoint: string) {
  const normalized = endpoint.trim()
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

export function getImageUploadSettings(): ImageUploadSettings {
  if (typeof window === 'undefined') {
    return {
      endpoint: getDefaultImageUploadEndpoint(),
      token: ''
    }
  }

  const savedEndpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY)

  return {
    endpoint: normalizeImageUploadEndpoint(savedEndpoint || getDefaultImageUploadEndpoint()),
    token: localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  }
}

export function saveImageUploadSettings(settings: ImageUploadSettings) {
  const endpoint = normalizeImageUploadEndpoint(settings.endpoint)
  const token = settings.token.trim()

  if (endpoint) {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, endpoint)
  } else {
    localStorage.removeItem(ENDPOINT_STORAGE_KEY)
  }

  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function clearStoredImageUploadToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function clearImageUploadSettings() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ENDPOINT_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}
