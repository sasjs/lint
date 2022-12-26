import { Diagnostic, LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'noGremlins'
const description = 'Disallow characters specified in grimlins array'
const message = 'Line contains a grimlin character'

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
 * Lint rule that checks if a given line of text contains any grimlin.
 */
export const noGremlins: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}

const charFromHex = (hexCode: string) => String.fromCodePoint(parseInt(hexCode))

const gremlinCharacters = {
  '0x2013': {
    description: 'en dash'
  },
  '0x2018': {
    description: 'left single quotation mark'
  },
  '0x2019': {
    description: 'right single quotation mark'
  },
  '0x2029': {
    zeroWidth: true,
    description: 'paragraph separator'
  },
  '0x2066': {
    zeroWidth: true,
    description: 'Left to right'
  },
  '0x2069': {
    zeroWidth: true,
    description: 'Pop directional'
  },
  '0x0003': {
    description: 'end of text'
  },
  '0x000b': {
    description: 'line tabulation'
  },
  '0x00a0': {
    description: 'non breaking space'
  },
  '0x00ad': {
    description: 'soft hyphen'
  },
  '0x200b': {
    zeroWidth: true,
    description: 'zero width space'
  },
  '0x200c': {
    zeroWidth: true,
    description: 'zero width non-joiner'
  },
  '0x200e': {
    zeroWidth: true,
    description: 'left-to-right mark'
  },
  '0x201c': {
    description: 'left double quotation mark'
  },
  '0x201d': {
    description: 'right double quotation mark'
  },
  '0x202c': {
    zeroWidth: true,
    description: 'pop directional formatting'
  },
  '0x202d': {
    zeroWidth: true,
    description: 'left-to-right override'
  },
  '0x202e': {
    zeroWidth: true,
    description: 'right-to-left override'
  },
  '0xfffc': {
    zeroWidth: true,
    description: 'object replacement character'
  }
}
