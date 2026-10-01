/**
 * Deprecated setting names, mapped to the canonical key. An alias is folded onto
 * the canonical key before the merge, so a project that sets `noTabIndentation`
 * and a file that sets `noTabs` cannot end up carrying both - which would let
 * the alias win in the constructor and defeat the file.
 */
const aliases: Record<string, string> = {
  noTabIndentation: 'noTabs'
}

const normaliseAliases = (json: any): any => {
  if (!isPlainObject(json)) return json

  const normalised = { ...json }

  for (const [alias, canonical] of Object.entries(aliases)) {
    if (alias in normalised) {
      if (!(canonical in normalised)) {
        normalised[canonical] = normalised[alias]
      }

      delete normalised[alias]
    }
  }

  return normalised
}

/**
 * Merges a per-file configuration override over the project configuration.
 *
 * Scalars replace, arrays are additive, and objects merge key by key. A file
 * therefore adds an allowed gremlin, a required macro option or a severity
 * level without having to restate the rest of the project configuration, and
 * it can still switch a rule off or raise a limit for itself. Deprecated
 * setting names are folded onto their canonical key first.
 */
export const mergeLintConfig = (base: any, override: any): any => {
  const normalisedOverride = normaliseAliases(override)

  if (!isPlainObject(base) || !isPlainObject(normalisedOverride)) {
    return normalisedOverride
  }

  const merged: any = normaliseAliases(base)

  for (const [key, value] of Object.entries(normalisedOverride)) {
    const current = merged[key]

    if (Array.isArray(current) && Array.isArray(value)) {
      merged[key] = mergeArrays(current, value)
    } else if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else {
      merged[key] = value
    }
  }

  return merged
}

const isPlainObject = (value: any): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isPrimitiveArray = (value: any[]): boolean =>
  value.every((item) => item === null || typeof item !== 'object')

/**
 * Concatenates two arrays. Arrays of primitives are de-duplicated, so an
 * override that repeats an entry the project already lists does not add it
 * twice.
 */
const mergeArrays = (base: any[], override: any[]): any[] =>
  isPrimitiveArray(base) && isPrimitiveArray(override)
    ? [...new Set([...base, ...override])]
    : [...base, ...override]
