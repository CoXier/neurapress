import type { RendererOptions } from '@/lib/markdown'

export interface Template {
  id: string
  name: string
  description: string
  styles: string
  options: RendererOptions
  transform?: (html: string) => string | { html?: string; content?: string }
}

export const MINIMAL_TEMPLATE_ID = 'default'

export const templates: Template[] = [
  {
    id: MINIMAL_TEMPLATE_ID,
    name: '极简主义',
    description: '克制、清爽、适合长文阅读的公众号样式',
    styles: 'prose-minimal',
    options: {
      base: {
        themeColor: '#111827',
        fontFamily: '-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
        textAlign: 'left',
        lineHeight: '1.85',
        padding: '0',
        maxWidth: '100%',
        margin: '0 auto',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        fontSize: '15px',
        color: '#24292f'
      },
      block: {
        h1: {
          margin: '2.2em 0 1.1em',
          padding: '0 0 0.65em',
          borderBottom: '1px solid #d8dee4',
          fontSize: '24px',
          fontWeight: 700,
          lineHeight: '1.35',
          textAlign: 'left',
          letterSpacing: '0'
        },
        h2: {
          margin: '2em 0 1em',
          padding: '0 0 0.45em',
          borderBottom: '1px solid #eaeef2',
          fontSize: '20px',
          fontWeight: 700,
          lineHeight: '1.4',
          textAlign: 'left',
          letterSpacing: '0'
        },
        h3: {
          margin: '1.8em 0 0.8em',
          paddingLeft: '10px',
          borderLeft: '2px solid #111827',
          fontSize: '17px',
          fontWeight: 700,
          lineHeight: '1.5',
          letterSpacing: '0'
        },
        h4: {
          margin: '1.6em 0 0.7em',
          fontSize: '16px',
          fontWeight: 700,
          lineHeight: '1.5',
          letterSpacing: '0'
        },
        h5: {
          margin: '1.4em 0 0.6em',
          fontSize: '15px',
          fontWeight: 700,
          lineHeight: '1.5',
          letterSpacing: '0'
        },
        h6: {
          margin: '1.4em 0 0.6em',
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: '1.5',
          letterSpacing: '0'
        },
        p: {
          margin: '1.15em 0',
          fontSize: '15px',
          lineHeight: '1.85',
          color: '#24292f',
          textAlign: 'justify',
          letterSpacing: '0.02em'
        },
        blockquote: {
          margin: '1.4em 0',
          padding: '0.1em 0 0.1em 1em',
          borderLeft: '2px solid #d0d7de',
          background: 'transparent',
          color: '#57606a',
          fontStyle: 'normal'
        },
        code_pre: {
          margin: '1.4em 0',
          padding: '1em',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.6',
          overflowX: 'auto'
        },
        code: {
          margin: '0',
          fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace'
        },
        image: {
          display: 'block',
          width: '100% !important',
          margin: '1.4em auto',
          borderRadius: '4px'
        },
        ol: {
          margin: '1.15em 0',
          paddingLeft: '1.8em',
          color: '#24292f'
        },
        ul: {
          margin: '1.15em 0',
          paddingLeft: '1.8em',
          color: '#24292f'
        },
        table: {
          width: '100%',
          margin: '1.5em 0',
          borderCollapse: 'collapse',
          borderSpacing: '0',
          tableLayout: 'fixed',
          fontSize: '14px',
          lineHeight: '1.65',
          color: '#24292f'
        },
        thead: {
          background: '#f6f8fa'
        },
        th: {
          padding: '10px 8px',
          borderTop: '1px solid #d8dee4',
          borderBottom: '1px solid #d8dee4',
          background: '#f6f8fa',
          color: '#111827',
          fontWeight: 700,
          textAlign: 'left',
          wordBreak: 'break-word'
        },
        td: {
          padding: '10px 8px',
          borderBottom: '1px solid #eaeef2',
          color: '#374151',
          textAlign: 'left',
          verticalAlign: 'top',
          wordBreak: 'break-word'
        },
        footnotes: {
          margin: '2em 0 0',
          paddingTop: '1em',
          borderTop: '1px solid #eaeef2',
          fontSize: '12px',
          color: '#57606a'
        }
      },
      inline: {
        listitem: {
          margin: '0.35em 0',
          lineHeight: '1.85',
          color: '#24292f'
        },
        codespan: {
          fontSize: '90%',
          color: '#24292f',
          background: '#f6f8fa',
          padding: '2px 5px',
          borderRadius: '4px',
          fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace'
        },
        em: {
          fontStyle: 'italic',
          fontSize: 'inherit',
          color: '#57606a'
        },
        link: {
          color: '#576b95',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(87, 107, 149, 0.35)'
        },
        strong: {
          color: '#111827',
          fontWeight: 700,
          fontSize: 'inherit'
        },
        del: {
          color: '#8c959f',
          textDecoration: 'line-through'
        },
        footnote: {
          fontSize: '12px',
          color: '#57606a'
        }
      }
    },
    transform: (html: string) => html
  }
]
