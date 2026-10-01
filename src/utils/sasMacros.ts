/**
 * Names of the macros that ship with SAS - the macro language statements, the
 * macro functions, and the autocall macros that SAS provides.
 *
 * A macro invocation matching one of these names is treated as declared, so it
 * is never reported by the `noUndeclaredMacros` rule and never written to a
 * file header by the formatter. Comparison is case-insensitive, because SAS
 * macro names are.
 *
 * The list is deliberately broad. A SAS macro that is missing from it produces
 * a false positive, which is the failure mode this list exists to avoid. The
 * inverse (a name listed here that SAS does not ship) only suppresses a
 * warning for that one name.
 */
const names = [
  // Macro language statements.
  'abort',
  'by',
  'copy',
  'display',
  'do',
  'else',
  'end',
  'global',
  'goto',
  'if',
  'inc',
  'include',
  'input',
  'label',
  'let',
  'list',
  'local',
  'macro',
  'mend',
  'put',
  'return',
  'symdel',
  'symexist',
  'symglobl',
  'symlocal',
  'syscall',
  'sysexec',
  'syslput',
  'sysmacdelete',
  'sysmexecdepth',
  'sysmexecname',
  'sysmstoreclear',
  'sysrput',
  'sysset',
  'then',
  'to',
  'until',
  'while',
  'window',
  // Macro functions.
  'bquote',
  'cmp',
  'cmpres',
  'datatyp',
  'dequote',
  'eval',
  'index',
  'indexc',
  'indexw',
  'left',
  'length',
  'lowcase',
  'nrbquote',
  'nrquote',
  'nrstr',
  'qbquote',
  'qcmpres',
  'qdequote',
  'qindex',
  'qindexc',
  'qindexw',
  'qleft',
  'qlowcase',
  'qscan',
  'qsubstr',
  'qsysfunc',
  'qtrim',
  'quote',
  'qupcase',
  'scan',
  'str',
  'substr',
  'superq',
  'sysevalf',
  'sysfunc',
  'sysget',
  'sysprod',
  'sysver',
  'translate',
  'tranwrd',
  'trim',
  'trimn',
  'unquote',
  'upcase',
  'verify',
  // Double byte character set variants of the macro functions.
  'kindex',
  'kindexc',
  'kindexw',
  'kleft',
  'klowcase',
  'kscan',
  'ksubstr',
  'kupcase',
  'kverify',
  // Autocall macros that SAS provides for common tasks.
  'csv2ds',
  'ds2const',
  'ds2csv',
  'ds2xls',
  'xls2ds'
]

/**
 * The set of macro names that ship with SAS, lowercased for comparison.
 */
export const sasMacros: Set<string> = new Set(names)

/**
 * Reports whether a macro name is one of the macros that ship with SAS.
 * @param {string} name - the macro name to test.
 * @returns {boolean} true when the name belongs to a SAS-provided macro.
 */
export const isSasMacro = (name: string): boolean =>
  sasMacros.has(name.toLowerCase())
