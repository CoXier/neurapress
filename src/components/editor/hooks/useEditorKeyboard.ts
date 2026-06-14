import { useCallback } from 'react'

interface UseEditorKeyboardProps {
  value: string
  onChange: (value: string) => void
}

export const useEditorKeyboard = ({
  value,
  onChange
}: UseEditorKeyboardProps) => {
  // 处理Tab键
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // 插入两个空格作为缩进
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)

      // 恢复光标位置
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  return { handleKeyDown }
}
