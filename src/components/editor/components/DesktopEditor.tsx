'use client'

import { type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { templates } from '@/config/wechat-templates'
import { EditorPreview } from './EditorPreview'
import { MarkdownToolbar } from './MarkdownToolbar'
import { type PreviewSize } from '../constants'
import { type CodeThemeId } from '@/config/code-themes'

function getImageFilesFromItems(items: DataTransferItemList) {
  return Array.from(items)
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))
}

function getImageFilesFromFileList(files: FileList) {
  return Array.from(files).filter(file => file.type.startsWith('image/'))
}

interface DesktopEditorProps {
  editorRef: RefObject<HTMLDivElement>
  textareaRef: RefObject<HTMLTextAreaElement>
  previewRef: RefObject<HTMLDivElement>
  value: string
  selectedTemplate: string
  showPreview: boolean
  previewSize: PreviewSize
  isConverting: boolean
  previewContent: string
  codeTheme: CodeThemeId
  onValueChange: (value: string) => void
  onEditorChange: (value: string) => void
  onEditorScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void
  onPreviewSizeChange: (size: PreviewSize) => void
  onToolbarInsert: (text: string, options?: { wrap?: boolean; placeholder?: string; suffix?: string }) => void
  onUndo: () => void
  onRedo: () => void
  onImageUpload: (files: File[]) => void | Promise<void>
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  isUploadingImage: boolean
}

export function DesktopEditor({
  editorRef,
  textareaRef,
  previewRef,
  value,
  selectedTemplate,
  showPreview,
  previewSize,
  isConverting,
  previewContent,
  codeTheme,
  onValueChange,
  onEditorChange,
  onEditorScroll,
  onPreviewSizeChange,
  onToolbarInsert,
  onUndo,
  onRedo,
  onImageUpload,
  onKeyDown,
  isUploadingImage
}: DesktopEditorProps) {
  return (
    <div className="hidden md:flex flex-1 h-full">
      <div
        ref={editorRef}
        className={cn(
          "editor-container bg-background transition-all duration-300 ease-in-out flex flex-col h-full",
          showPreview ? "w-1/2 border-r" : "w-full",
          selectedTemplate && templates.find(t => t.id === selectedTemplate)?.styles
        )}
      >
        <MarkdownToolbar
          onInsert={onToolbarInsert}
          onUndo={onUndo}
          onRedo={onRedo}
          onImageUpload={onImageUpload}
          isUploadingImage={isUploadingImage}
        />
        <div className="flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => {
              const scrollTop = e.target.scrollTop;
              onValueChange(e.target.value)
              onEditorChange(e.target.value)
              // 保持滚动位置
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.scrollTop = scrollTop;
                }
              });
            }}
            onKeyDown={onKeyDown}
            onPaste={e => {
              const imageFiles = getImageFilesFromItems(e.clipboardData.items)
              if (imageFiles.length === 0) return

              e.preventDefault()
              onImageUpload(imageFiles)
            }}
            onDrop={e => {
              const imageFiles = getImageFilesFromFileList(e.dataTransfer.files)
              if (imageFiles.length === 0) return

              e.preventDefault()
              onImageUpload(imageFiles)
            }}
            onDragOver={e => {
              const hasImage = Array.from(e.dataTransfer.items || [])
                .some(item => item.kind === 'file' && item.type.startsWith('image/'))
              if (hasImage) {
                e.preventDefault()
              }
            }}
            onScroll={e => {
              if (textareaRef.current) {
                onEditorScroll(e)
              }
            }}
            className="w-full h-full resize-none outline-none p-4 font-mono text-base leading-relaxed overflow-y-auto scrollbar-none"
            placeholder="开始写作..."
            spellCheck={false}
          />
        </div>
      </div>

      {showPreview && (
        <EditorPreview
          previewRef={previewRef}
          selectedTemplate={selectedTemplate}
          previewSize={previewSize}
          isConverting={isConverting}
          previewContent={previewContent}
          codeTheme={codeTheme}
          onPreviewSizeChange={onPreviewSizeChange}
        />
      )}
    </div>
  )
}
