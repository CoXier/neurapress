import { useMemo } from 'react'

// 计算阅读时间（假设每分钟阅读300字）
const calculateReadingTime = (text: string): string => {
  const words = text.trim().length
  const minutes = Math.ceil(words / 300)
  return `${minutes} 分钟`
}

// 计算字数
const calculateWordCount = (text: string): string => {
  const count = text.trim().length
  return count.toLocaleString()
}

const extractTextFromMarkdown = (markdown: string): string => {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[\s-]*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~|:]/g, '')
}

export const useWordStats = (content: string) => {
  return useMemo(() => {
    const plainText = extractTextFromMarkdown(content)
    return {
      wordCount: calculateWordCount(plainText),
      readingTime: calculateReadingTime(plainText)
    }
  }, [content])
}
