export interface Macro {
  name: string
  startLineNumbers: number[]
  endLineNumber: number | null
  declarationLines: string[]
  terminationLine: string
  declaration: string
  termination: string
  parentMacro: string
  hasMacroNameInMend: boolean
  mismatchedMendMacroName: string
}
