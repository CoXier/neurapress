import type { StyleOptions, RendererOptions } from './types'
import { codeThemes, type CodeThemeId } from '@/config/code-themes'

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 将样式对象转换为 CSS 字符串
export function cssPropertiesToString(style: StyleOptions = {}): string {
  if (!style) return ''

  const unitlessProperties = new Set([
    'font-weight',
    'line-height',
    'opacity',
    'z-index',
    'flex',
    'flex-grow',
    'flex-shrink',
    'order'
  ])

  const css = Object.entries(style)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // 处理媒体查询
      if (key === '@media (max-width: 768px)') {
        return ''  // 我们不在内联样式中包含媒体查询
      }

      // 转换驼峰命名为连字符命名
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()

      // 处理数字值
      if (typeof value === 'number' && !unitlessProperties.has(cssKey)) {
        value = `${value}px`
      }

      return `${cssKey}: ${value}`
    })
    .filter(Boolean)  // 移除空字符串
    .join(';')

  return escapeHtmlAttribute(css)
}

// 将基础样式选项转换为 CSS 字符串
export function baseStylesToString(base: RendererOptions['base'] = {}): string {
  if (!base) return ''

  const styles: string[] = []

  if (base.lineHeight) {
    styles.push(`line-height: ${base.lineHeight}`)
  }
  if (base.fontSize) {
    styles.push(`font-size: ${base.fontSize}`)
  }
  if (base.textAlign) {
    styles.push(`text-align: ${base.textAlign}`)
  }
  if (base.fontFamily) {
    styles.push(`font-family: ${base.fontFamily}`)
  }
  if (base.color) {
    styles.push(`color: ${base.color}`)
  }
  if (base.padding) {
    styles.push(`padding: ${base.padding}`)
  }
  if (base.margin) {
    styles.push(`margin: ${base.margin}`)
  }
  if (base.maxWidth) {
    styles.push(`max-width: ${base.maxWidth}`)
  }
  if (base.wordBreak) {
    styles.push(`word-break: ${base.wordBreak}`)
  }
  if (base.whiteSpace) {
    styles.push(`white-space: ${base.whiteSpace}`)
  }
  if (base.themeColor) {
    styles.push(`--theme-color: ${base.themeColor}`)
  }

  return escapeHtmlAttribute(styles.join(';'))
}

// 获取代码主题的样式
export function getCodeThemeStyles(theme: CodeThemeId): StyleOptions {
  const themeConfig = codeThemes.find(t => t.id === theme)
  if (!themeConfig) return {}

  return {
    background: themeConfig.theme.background,
    color: themeConfig.theme.text,
  }
}

// 获取代码token的样式
export function getTokenStyles(theme: CodeThemeId, tokenType: string): string {
  const themeConfig = codeThemes.find(t => t.id === theme)
  if (!themeConfig) return ''

  const tokenColor = themeConfig.theme[tokenType as keyof typeof themeConfig.theme]
  if (!tokenColor) return ''
  return `color: ${tokenColor};`
}
