export const trimComments = (
  statement: string,
  commentStarted: boolean = false
): { statement: string; commentStarted: boolean } => {
  let trimmed = (statement || '').trim()

  if (commentStarted || trimmed.startsWith('/*')) {
    const parts = trimmed.split('*/')
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
    const remainingStatement = trimmed.slice(
      trimmed.indexOf('/*'),
      trimmed.length
    )

    const result = trimComments(remainingStatement, false)
    return {
      statement: statementBeforeCommentStarts + result.statement,
      commentStarted: result.commentStarted
    }
  }
  return { statement: trimmed, commentStarted: false }
}
