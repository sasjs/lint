export const trimComments = (
  statement: string,
  commentStarted: boolean = false
): { statement: string; commentStarted: boolean } => {
  let trimmed = statement.trim()

  if (commentStarted || trimmed.startsWith('/*')) {
    const parts = trimmed.split('*/')
    if (parts.length > 1) {
      return {
        statement: (parts.pop() as string).trim(),
        commentStarted: false
      }
    } else {
      return { statement: '', commentStarted: true }
    }
  }
  return { statement: trimmed, commentStarted: false }
}
