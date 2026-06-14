import { useCallback } from 'react'

export function useAutoSave(setIsDraft: (isDraft: boolean) => void) {
  const handleEditorChange = useCallback((_value?: string) => {
    setIsDraft(true)
  }, [setIsDraft])

  return { handleEditorChange }
}
