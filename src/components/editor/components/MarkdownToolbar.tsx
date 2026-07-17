import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Baseline,
  Bold,
  Highlighter,
  Italic,
  Loader2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  ImagePlus,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  CheckSquare
} from 'lucide-react'
import { MarkdownCheatSheet } from './MarkdownCheatSheet'

interface MarkdownToolbarProps {
  onInsert: (text: string, options?: { wrap?: boolean; placeholder?: string; suffix?: string }) => void
  onImageUpload?: (files: File[]) => void | Promise<void>
  isUploadingImage?: boolean
}

type ToolButton = {
  icon: React.ReactNode
  title: string
  text: string
  action?: 'upload-image'
  wrap?: boolean
  placeholder?: string
  suffix?: string
}

type Tool = ToolButton | { type: 'separator' } | { type: 'colors' }

const TEXT_COLORS = [
  { name: '黑色', value: '#111827' },
  { name: '灰色', value: '#667085' },
  { name: '红色', value: '#d92d20' },
  { name: '橙色', value: '#d97706' },
  { name: '绿色', value: '#008f5a' },
  { name: '蓝色', value: '#2563eb' },
  { name: '紫色', value: '#7c3aed' },
  { name: '粉色', value: '#db2777' }
]

const BACKGROUND_COLORS = [
  { name: '灰色背景', value: '#f2f4f7' },
  { name: '红色背景', value: '#fee4e2' },
  { name: '橙色背景', value: '#fef0c7' },
  { name: '黄色背景', value: '#fef7c3' },
  { name: '绿色背景', value: '#ddf7ea' },
  { name: '蓝色背景', value: '#e4edff' },
  { name: '紫色背景', value: '#f0e7ff' },
  { name: '粉色背景', value: '#fce7f3' }
]

interface ColorMenuProps {
  label: string
  colors: typeof TEXT_COLORS
  icon: React.ReactNode
  cssProperty: 'color' | 'background-color'
  placeholder: string
  onInsert: MarkdownToolbarProps['onInsert']
}

function ColorMenu({ label, colors, icon, cssProperty, placeholder, onInsert }: ColorMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label={label}
            >
              {icon}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-40 p-2">
        <DropdownMenuLabel className="px-1 pb-2 pt-0 text-xs font-medium text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuGroup className="grid grid-cols-4 gap-1">
          {colors.map(color => (
            <DropdownMenuItem
              key={color.value}
              className="h-8 w-8 cursor-pointer justify-center rounded-sm p-0 focus:bg-muted"
              aria-label={color.name}
              title={color.name}
              onSelect={() => {
                onInsert(`<span style="${cssProperty}: ${color.value} !important;">`, {
                  wrap: true,
                  suffix: '</span>',
                  placeholder
                })
              }}
            >
              <span
                className="h-5 w-5 rounded-sm border border-black/10"
                style={{ backgroundColor: color.value }}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TextColorTools({ onInsert }: Pick<MarkdownToolbarProps, 'onInsert'>) {
  return (
    <>
      <ColorMenu
        label="文字颜色"
        colors={TEXT_COLORS}
        icon={<Baseline className="h-4 w-4" />}
        cssProperty="color"
        placeholder="文字"
        onInsert={onInsert}
      />
      <ColorMenu
        label="背景颜色"
        colors={BACKGROUND_COLORS}
        icon={<Highlighter className="h-4 w-4" />}
        cssProperty="background-color"
        placeholder="高亮文字"
        onInsert={onInsert}
      />
    </>
  )
}

export function MarkdownToolbar({ onInsert, onImageUpload, isUploadingImage = false }: MarkdownToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tools: Tool[] = [
    {
      icon: <Heading1 className="h-4 w-4" />,
      title: '标题 1',
      text: '# ',
      placeholder: '标题'
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      title: '标题 2',
      text: '## ',
      placeholder: '标题'
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      title: '标题 3',
      text: '### ',
      placeholder: '标题'
    },
    { type: 'separator' },
    {
      icon: <Bold className="h-4 w-4" />,
      title: '粗体',
      text: '**',
      wrap: true,
      placeholder: '粗体文本'
    },
    {
      icon: <Italic className="h-4 w-4" />,
      title: '斜体',
      text: '*',
      wrap: true,
      placeholder: '斜体文本'
    },
    { type: 'colors' },
    { type: 'separator' },
    {
      icon: <List className="h-4 w-4" />,
      title: '无序列表',
      text: '- ',
      placeholder: '列表项'
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      title: '有序列表',
      text: '1. ',
      placeholder: '列表项'
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      title: '任务列表',
      text: '- [ ] ',
      placeholder: '任务'
    },
    { type: 'separator' },
    {
      icon: <Quote className="h-4 w-4" />,
      title: '引用',
      text: '> ',
      placeholder: '引用文本'
    },
    {
      icon: <Code className="h-4 w-4" />,
      title: '代码块',
      text: '```\n',
      wrap: true,
      suffix: '\n```',
      placeholder: '在此输入代码'
    },
    { type: 'separator' },
    {
      icon: <Link className="h-4 w-4" />,
      title: '链接',
      text: '[',
      wrap: true,
      suffix: '](url)',
      placeholder: '链接文本'
    },
    {
      icon: isUploadingImage
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <ImagePlus className="h-4 w-4" />,
      title: '上传图片',
      text: '![',
      action: 'upload-image',
      wrap: true,
      suffix: '](url)',
      placeholder: '图片描述'
    },
    { type: 'separator' },
    {
      icon: <Table className="h-4 w-4" />,
      title: '表格',
      text: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |',
      placeholder: ''
    },
    {
      icon: <Minus className="h-4 w-4" />,
      title: '分割线',
      text: '\n---\n',
      placeholder: ''
    }
  ]

  return (
    <TooltipProvider>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          event.target.value = ''
          if (files.length > 0) {
            onImageUpload?.(files)
          }
        }}
      />
      <div className="flex items-center gap-0.5 px-2 py-1 border-b">
        {tools.map((tool, index) => {
          if ('type' in tool && tool.type === 'separator') {
            return <Separator key={index} orientation="vertical" className="mx-0.5 h-4" />
          }

          if ('type' in tool && tool.type === 'colors') {
            return <TextColorTools key={index} onInsert={onInsert} />
          }

          const buttonTool = tool as ToolButton
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={buttonTool.action === 'upload-image' && isUploadingImage}
                  onClick={(e) => {
                    e.preventDefault()
                    if (buttonTool.action === 'upload-image' && onImageUpload) {
                      fileInputRef.current?.click()
                      return
                    }

                    onInsert(buttonTool.text, {
                      wrap: buttonTool.wrap,
                      placeholder: buttonTool.placeholder,
                      suffix: buttonTool.suffix
                    })
                  }}
                >
                  {buttonTool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{buttonTool.title}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
        <Separator orientation="vertical" className="mx-1 h-6" />
        <MarkdownCheatSheet />
      </div>
    </TooltipProvider>
  )
}
