export const getColumnNumber = (statement: string, text: string): number => {
  const index = (statement.split('\n').pop() as string).indexOf(text)
  if (index < 0) {
    throw new Error(
      `String '${text}' was not found in statement '${statement}'`
    )
  }
  return (statement.split('\n').pop() as string).indexOf(text) + 1
}
