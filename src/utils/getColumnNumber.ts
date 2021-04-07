export const getColumnNumber = (line: string, text: string): number => {
  const index = (line.split('\n').pop() as string).indexOf(text)
  if (index < 0) {
    throw new Error(`String '${text}' was not found in line '${line}'`)
  }
  return (line.split('\n').pop() as string).indexOf(text) + 1
}
