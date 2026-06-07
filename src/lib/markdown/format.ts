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

function createSeparator(alignment: 'left' | 'center' | 'right') {
  if (alignment === 'center') return ':---:'
  if (alignment === 'right') return '---:'
  return '---'
}

function formatTableCell(cell: string) {
  return cell.replace(/\s+/g, ' ').trim()
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

  return normalizedRows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      if (rowIndex === 1) {
        return createSeparator(block.alignments[columnIndex])
      }
      return cell
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
