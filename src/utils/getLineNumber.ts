export const getLineNumber = (lines: string[], index: number): number => {
  const combinedCode = lines.slice(0, index).join('\n')
  return (combinedCode.match(/\n/g) || []).length + 1
}
