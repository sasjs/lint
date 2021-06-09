export const trimComments = (
  statement: string,
  commentStarted: boolean = false,
  trimEnd: boolean = false
): { statement: string; commentStarted: boolean } => {
  let trimmed = trimEnd ? (statement || '').trimEnd() : (statement || '').trim()

  if (commentStarted || trimmed.startsWith('/*')) {
    const parts = trimmed.startsWith('/*')
      ? trimmed.slice(2).split('*/')
      : trimmed.split('*/')
    if (parts.length === 2) {
      return {
        statement: (parts.pop() as string).trim(),
        commentStarted: false
      }
    } else if (parts.length > 2) {
      parts.shift()
      return trimComments(parts.join('*/'), false)
    } else {
      return { statement: '', commentStarted: true }
    }
  } else if (trimmed.includes('/*')) {
    const statementBeforeCommentStarts = trimmed.slice(0, trimmed.indexOf('/*'))
    trimmed = trimmed.slice(trimmed.indexOf('/*') + 2)
    const remainingStatement = trimmed.slice(trimmed.indexOf('*/') + 2)

    const result = trimComments(remainingStatement, false, true)
    const completeStatement = statementBeforeCommentStarts + result.statement
    return {
      statement: trimEnd
        ? completeStatement.trimEnd()
        : completeStatement.trim(),
      commentStarted: result.commentStarted
    }
  }
  return { statement: trimmed, commentStarted: false }
}
