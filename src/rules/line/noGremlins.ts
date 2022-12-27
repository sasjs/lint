import { Diagnostic, LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { gremlinCharacters } from '../../utils'

const name = 'noGremlins'
const description = 'Disallow characters specified in gremlins array'
const message = 'Line contains a gremlin'

const test = (value: string, lineNumber: number, config?: LintConfig) => {
  const severity = config?.severityLevel[name] || Severity.Warning

  const diagnostics: Diagnostic[] = []

  const gremlins: any = {}

  for (const [hexCode, config] of Object.entries(gremlinCharacters)) {
    gremlins[charFromHex(hexCode)] = Object.assign({}, config, {
      hexCode
    })
  }

  const regexpWithAllChars = new RegExp(
    Object.keys(gremlins)
      .map((char) => `${char}+`)
      .join('|'),
    'g'
  )

  let match
  while ((match = regexpWithAllChars.exec(value))) {
    const matchedCharacter = match[0][0]
    const gremlin = gremlins[matchedCharacter]

    diagnostics.push({
      message: `${message}: ${gremlin.description}, hexCode(${gremlin.hexCode})`,
      lineNumber,
      startColumnNumber: match.index + 1,
      endColumnNumber: match.index + 1 + match[0].length,
      severity
    })
  }

  return diagnostics
}

/**
 * Lint rule that checks if a given line of text contains any gremlins.
 */
export const noGremlins: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}

const charFromHex = (hexCode: string) => String.fromCodePoint(parseInt(hexCode))
