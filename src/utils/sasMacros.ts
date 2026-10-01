import { sasMacros as names } from './sasMacros.generated'

/**
 * The set of macro names that ship with SAS, lower-cased for comparison.
 *
 * The names are generated from the macroStatements and macroFunctions groups of
 * `@sasjs/sas-language`, which owns the SAS language data - see
 * `scripts/generate-macro-names.mjs`. A macro matching one of these names is
 * treated as declared, so it is never reported by `noUndeclaredMacros` and
 * never written to a file header by the formatter.
 */
export const sasMacros: Set<string> = new Set(names)

/**
 * Reports whether a macro name is one of the macros that ship with SAS.
 * @param {string} name - the macro name to test.
 * @returns {boolean} true when the name belongs to a SAS-provided macro.
 */
export const isSasMacro = (name: string): boolean =>
  sasMacros.has(name.toLowerCase())
