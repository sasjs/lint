export const getColNumber = (statement: string, text: string): number => {
  return (statement.split('\n').pop() as string).indexOf(text) + 1
}
