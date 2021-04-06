export const getLineNumber = (statements: string[], index: number): number => {
  const combinedCode = statements.slice(0, index).join(';')
  const lines = (combinedCode.match(/\n/g) || []).length + 1
  return lines
}
