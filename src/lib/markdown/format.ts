type TableBlock = {
  start: number
  end: number
  rows: string[][]
  alignments: Array<'left' | 'center' | 'right'>
}

function isFenceLine(line: string) {
  return /^\s*(```|~~~)/.test(line)
}

function isTableLine(line: string) {
  const trimmed = line.trim()
  return trimmed.includes('|') && /^\|?.+\|.+\|?$/.test(trimmed)
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line)
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()))
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function getAlignment(separator: string): 'left' | 'center' | 'right' {
  const value = separator.trim()
  if (value.startsWith(':') && value.endsWith(':')) return 'center'
  if (value.endsWith(':')) return 'right'
  return 'left'
}

function isWideCodePoint(codePoint: number) {
  return (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    )
  )
}

function getDisplayWidth(value: string) {
  let width = 0

  for (const char of value) {
    const codePoint = char.codePointAt(0) || 0
    if (/[\u0300-\u036f]/.test(char)) continue
    width += isWideCodePoint(codePoint) ? 2 : 1
  }

  return width
}

function createSeparator(width: number, alignment: 'left' | 'center' | 'right') {
  const normalizedWidth = Math.max(width, 3)
  if (alignment === 'center') return `:${'-'.repeat(Math.max(normalizedWidth - 2, 1))}:`
  if (alignment === 'right') return `${'-'.repeat(Math.max(normalizedWidth - 1, 2))}:`
  return '-'.repeat(normalizedWidth)
}

function formatTableCell(cell: string) {
  return cell.replace(/\s+/g, ' ').trim()
}

function padCell(cell: string, width: number, alignment: 'left' | 'center' | 'right') {
  const gap = Math.max(width - getDisplayWidth(cell), 0)
  if (alignment === 'right') return `${' '.repeat(gap)}${cell}`
  if (alignment === 'center') {
    const left = Math.floor(gap / 2)
    const right = gap - left
    return `${' '.repeat(left)}${cell}${' '.repeat(right)}`
  }
  return `${cell}${' '.repeat(gap)}`
}

function findTableBlock(lines: string[], start: number): TableBlock | null {
  if (start + 1 >= lines.length || !isTableLine(lines[start]) || !isTableSeparator(lines[start + 1])) {
    return null
  }

  let end = start + 2
  while (end < lines.length && isTableLine(lines[end])) {
    end += 1
  }

  const rows = lines.slice(start, end).map(splitTableRow)
  const columnCount = Math.max(...rows.map(row => row.length))
  const alignments = splitTableRow(lines[start + 1]).map(getAlignment)
  while (alignments.length < columnCount) {
    alignments.push('left')
  }

  return {
    start,
    end,
    rows,
    alignments
  }
}

function formatTable(block: TableBlock) {
  const columnCount = Math.max(...block.rows.map(row => row.length))
  const normalizedRows = block.rows.map(row => {
    const next = row.map(formatTableCell)
    while (next.length < columnCount) {
      next.push('')
    }
    return next
  })

  const contentRows = normalizedRows.filter((_, index) => index !== 1)
  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const contentWidth = Math.max(...contentRows.map(row => getDisplayWidth(row[columnIndex])), 3)
    const separatorWidth = createSeparator(contentWidth, block.alignments[columnIndex]).length
    return Math.max(contentWidth, separatorWidth)
  })

  return normalizedRows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      if (rowIndex === 1) {
        return createSeparator(widths[columnIndex], block.alignments[columnIndex])
      }
      return padCell(cell, widths[columnIndex], block.alignments[columnIndex])
    })

    return `| ${cells.join(' | ')} |`
  })
}

function normalizeLine(line: string) {
  const trimmedEnd = line.trimEnd()

  if (!trimmedEnd.trim()) return ''
  if (/^\s{0,3}#{1,6}\s*/.test(trimmedEnd)) {
    return trimmedEnd.replace(/^\s{0,3}(#{1,6})\s*(.*?)\s*#*\s*$/, '$1 $2')
  }
  const unorderedListMatch = trimmedEnd.match(/^(\s{0,3})[-*+]\s+(.*)$/)
  if (unorderedListMatch) {
    return `${unorderedListMatch[1]}- ${unorderedListMatch[2]}`
  }
  const orderedListMatch = trimmedEnd.match(/^(\s{0,3})(\d+)[.)]\s+(.*)$/)
  if (orderedListMatch) {
    return `${orderedListMatch[1]}${orderedListMatch[2]}. ${orderedListMatch[3]}`
  }
  const blockquoteMatch = trimmedEnd.match(/^(\s{0,3})>\s*(.*)$/)
  if (blockquoteMatch) {
    return blockquoteMatch[2] ? `${blockquoteMatch[1]}> ${blockquoteMatch[2]}` : `${blockquoteMatch[1]}>`
  }
  if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(trimmedEnd)) {
    return '---'
  }

  return trimmedEnd
}

function isFormattedTableLine(line: string) {
  return /^\|.*\|$/.test(line.trim())
}

function shouldSeparateBefore(line: string, previous: string) {
  if (!previous || !line) return false
  if (isFormattedTableLine(line) && !isFormattedTableLine(previous)) return true
  if (/^\s*(#{1,6}\s|>|-{3}$)/.test(line)) return true
  if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line) && !/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(previous)) return true
  return false
}

function shouldSeparateAfter(line: string, next: string) {
  if (!line || !next) return false
  if (isFormattedTableLine(line) && !isFormattedTableLine(next)) return true
  if (/^\s*(#{1,6}\s|---$)/.test(line)) return true
  if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line) && !/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(next)) return true
  return false
}

export function formatMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const normalized: string[] = []
  let inFence = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (isFenceLine(line)) {
      inFence = !inFence
      normalized.push(line.trimEnd())
      continue
    }

    if (inFence) {
      normalized.push(line)
      continue
    }

    const tableBlock = findTableBlock(lines, index)
    if (tableBlock) {
      normalized.push(...formatTable(tableBlock))
      index = tableBlock.end - 1
      continue
    }

    normalized.push(normalizeLine(line))
  }

  const spaced: string[] = []
  let spacingInFence = false

  normalized.forEach((line, index) => {
    const previous = spaced[spaced.length - 1] || ''
    const isFence = isFenceLine(line)
    const isOpeningFence = isFence && !spacingInFence
    const isClosingFence = isFence && spacingInFence

    if (spacingInFence && !isFence) {
      spaced.push(line)
      return
    }

    if (isOpeningFence && previous !== '') {
      spaced.push('')
    }

    if (shouldSeparateBefore(line, previous) && previous !== '') {
      spaced.push('')
    }

    spaced.push(line)

    if (isFence) {
      spacingInFence = !spacingInFence
      const next = normalized[index + 1] || ''
      if (isClosingFence && next !== '') {
        spaced.push('')
      }
      return
    }

    const next = normalized[index + 1] || ''
    if (shouldSeparateAfter(line, next) && next !== '') {
      spaced.push('')
    }
  })

  return spaced
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .concat('\n')
}
