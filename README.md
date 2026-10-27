![GitHub top language](https://img.shields.io/github/languages/top/sasjs/lint)
[![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/sasjs/lint)](https://github.com/sasjs/lint/issues?q=is%3Aissue+is%3Aclosed)
[![GitHub issues](https://img.shields.io/github/issues-raw/sasjs/lint)](https://github.com/sasjs/lint/issues)
![total lines](https://tokei.rs/b1/github/sasjs/lint)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/sasjs/lint)

# SAS Code linting and formatting

Our goal is to help SAS developers everywhere spend less time on code reviews, bug fixing and arguing about standards - and more time delivering extraordinary business value.

_Note:_ The SASjs project and its repositories are not affiliated with SAS Institute.

# Linting

@sasjs/lint is used by the following products:

- [@sasjs/vscode-extension](https://github.com/sasjs/vscode-extension) - just download SASjs in the VSCode marketplace, and select view/problems in the menu bar.
- [@sasjs/cli](https://cli.sasjs.io/lint) - run `sasjs lint` to get a list of all files with their problems, along with line and column indexes.

Configuration is via a `.sasjslint` file with the following structure (these are also the defaults - a setting that is absent, and a project with no `.sasjslint` file at all, uses the value below):

```json
{
  "allowedGremlins": [],
  "bannedStrings": ["error ", "error:", "warning ", "warning:"],
  "defaultHeader": "/**{lineEnding}  @file{lineEnding}  @brief <Your brief here>{lineEnding}{lineEnding}  <h4> SAS Macros </h4>{lineEnding}{lineEnding}**/",
  "hasDoxygenHeader": true,
  "hasMacroNameInMend": true,
  "hasMacroParentheses": true,
  "hasRequiredMacroOptions": false,
  "ignoreList": [],
  "ignoredLibnames": [],
  "ignoredMacros": ["webout"],
  "indentationMultiple": 2,
  "lineEndings": "off",
  "lowerCaseFileNames": true,
  "maxDataLineLength": 80,
  "maxHeaderLineLength": 80,
  "maxLineLength": 80,
  "minMacroNameLength": 3,
  "noBannedStrings": true,
  "noEncodedPasswords": true,
  "noGremlins": true,
  "noNestedCommentsInHeader": true,
  "noNestedMacros": true,
  "noSingleAsteriskComments": false,
  "noSpacesInFileNames": true,
  "noTabs": true,
  "noTrailingSpaces": true,
  "noUndeclaredMacros": true,
  "noUnusedLibnames": false,
  "noUnusedMacros": true,
  "requiredMacroOptions": [],
  "severityLevel": {},
  "strictMacroDefinition": true
}
```

Two keys do not have a section of their own. `requiredMacroOptions` is documented with [`hasRequiredMacroOptions`](#hasrequiredmacrooptions), the rule it configures. The deprecated alias `noTabIndentation` is accepted in place of `noTabs`, and is therefore not listed above - it is an alternative spelling rather than a setting of its own.

## SAS Lint Settings

Each setting can have three states:

- OFF - usually by setting the value to `false` or 0. In this case, the rule won't be executed.
- WARN - a warning is written to the log, but the return code will be 0
- ERROR - an error is written to the log, and the return code is 1

For more details, and the default state, see the description of each rule below. It is also possible to change whether a rule returns ERROR or WARN using the `severityLevel` object.

Configuring a non-zero return code (ERROR) is helpful when running `sasjs lint` as part of a git pre-commit hook. An example is available [here](https://github.com/sasjs/template_jobs/blob/main/.git-hooks/pre-commit).

## Per-file overrides

A file can adjust the configuration for itself, with a `@sasjslint` block in its Doxygen header:

```sas
/**
  @file
  @brief Calls the settlement API

  @sasjslint {"maxHeaderLineLength": 200, "noUndeclaredMacros": false}
**/
```

The block holds a JSON object that is merged over the resolved `.sasjslint`:

- scalars replace, so a file can switch a rule off, switch one on, or raise a limit for itself;
- arrays are additive, so `allowedGremlins` and `requiredMacroOptions` gain entries rather than replacing the project's;
- objects merge key by key, so a file can set one `severityLevel` without dropping the others.

The override applies to the whole file, and to the formatter, so `sasjs lint fix` and format-on-save honour it - a file that switches `noUnusedMacros` off keeps the entries it would otherwise lose. Only the header is read, so an override cannot be hidden in the body of a file, and a block that is malformed is ignored rather than raised. Place it outside the `<h4> SAS Macros </h4>` section, which the formatter rewrites.

One exception: `ignoreList` is evaluated before a file is read, so an entry a header adds cannot exclude the file it sits in.

### allowedGremlins

An array of hex codes that represents allowed gremlins (invisible / undesirable characters). To allow all gremlins, you can also set the `noGremlins` rule to `false`. The full gremlin list is [here](https://github.com/sasjs/lint/blob/main/src/utils/gremlinCharacters.ts).

Example:

```json
{
  "noGremlins": true,
  "allowedGremlins": ["0x0080", "0x3000"]
}
```

### bannedStrings

An array of strings for the [`noBannedStrings`](#nobannedstrings) rule to report. Matching is case insensitive, and each entry is matched literally rather than as a regular expression, so a trailing space means what it says: `"error "` matches `error ` but not `errors`, `error_flag` or `error:`. Each default entry ends the word with the space or the colon that follows it in a log line.

The default list is `["error ", "error:", "warning ", "warning:"]`. An explicit list replaces it, so `"bannedStrings": []` reports nothing.

Example:

```json
{
  "noBannedStrings": true,
  "bannedStrings": ["error ", "error:", "warning ", "warning:", "{sas001}"]
}
```

### defaultHeader

This isn't a rule, but a formatting setting, which applies to SAS program that do NOT begin with `/**`. It can be triggered by running `sasjs lint fix` in the SASjs CLI, or by hitting "save" when using the SASjs VS Code extension (with "formatOnSave" in place)

The default header is as follows:

```sas
/**
  @file
  @brief <Your brief here>

  <h4> SAS Macros </h4>

**/
```

A blank line separates the `<h4> SAS Macros </h4>` section from the header content before it and from whatever follows the list.

`<h4> SAS Macros </h4>` is the compile dependency list: `sasjs compile` reads it and inlines each macro as precode, so an entry is a file the build resolves. It is the only header list this linter reads, and every other `<h4>` list in the header (`SAS Includes`, `Binary Files`, `SAS Programs`, `Service Inputs`, `Service Outputs`, ...) is left entirely alone.

Each entry is the tag and one file token - `@li mf_trim.sas` - indented to the same width as the section tag; nothing may follow the token. The extension is dropped to give the macro name, so `@li mp_as` is read as `mp_as` too. A line carrying anything after the file token is not an entry: prose belongs on its own line, and a section that carries such a line is left as its author wrote it rather than being rewritten or having the line removed. The section is machine-maintained, so text after the token would be lost on the next rewrite anyway.

A tag one slip away from `@li` (`@il`, `@l1`, `@1i`) is read as an entry, so a typo cannot hide the declarations below it - and because such a line is read, nothing reports it, so the formatter writes every entry back as `@li <file>` at the section's indentation. The repair edits the entry lines in place, so it adds no blank lines and moves nothing else in the header.

A line that opens with any other tag - `@example`, `@param` - ends the list rather than being read or converted. The entries above it are still readable and still rewritable, so the formatter keeps adding and removing entries above that line and leaves the rest of the header alone.

If creating a new value, use `{lineEnding}` instead of `\n`, eg as follows:

```json
{
  "defaultHeader": "/**{lineEnding}  @file{lineEnding}  @brief Our Company Brief{lineEnding}**/"
}
```

### hasDoxygenHeader

The SASjs framework recommends the use of Doxygen headers for describing all types of SAS program. This check identifies files where a Doxygen header does not begin on the first line, where it opens with a single asterisk, and where it closes with one.

The closing half matters beyond style. This rule set and `sasjs compile` both locate the header's end by its `**/` terminator, so a header closed with a plain `*/` has no end they can find - a comment inside such a header can truncate it without being reported by [`noNestedCommentsInHeader`](#nonestedcommentsinheader). The fix widens the close marker to `**/`, which puts the header back where that check can see it. A header whose body already holds a comment opener is left alone: the first close marker may belong to that comment, and that decision belongs to the author.

- Default: true
- Severity: WARNING

### hasMacroNameInMend

The addition of the macro name in the `%mend` statement is optional, but can approve readability in large programs. A discussion on this topic can be found [here](https://www.linkedin.com/posts/allanbowe_sas-sasapps-sasjs-activity-6783413360781266945-1-7m). The default setting was the result of a poll with over 300 votes.

- Default: true
- Severity: WARNING

### hasMacroParentheses

As per the example [here](https://github.com/sasjs/lint/issues/20), macros defined without parentheses cause problems if that macro is ever extended (it's not possible to reliably extend that macro without potentially breaking some code that has used the macro). It's better to always define parentheses, even if they are not used. This check will also throw a warning if there are spaces between the macro name and the opening parenthesis.

- Default: true
- Severity: WARNING

### hasRequiredMacroOptions

This will require macros to have the options listed as "requiredMacroOptions." This is helpful if you want to ensure all macros are SECURE.

- Default: false
- severity: WARNING

Example

```json
{
  "hasRequiredMacroOptions": true,
  "requiredMacroOptions": ["SECURE", "SRC"]
}
```

### ignoreList

There may be specific files (or folders) that are not good candidates for linting. Simply list them in this array and they will be ignored. In addition, any files in the project `.gitignore` file will also be ignored.

### ignoredLibnames

The librefs that `noUnusedLibnames` leaves alone. List the librefs that a file assigns but does not use itself - because the connection is used by an autoexec, by `%include`d code, or by another file in the same flow:

```json
{
  "ignoredLibnames": ["outData", "TESTWORK"]
}
```

A single file can add to this list with the `ignoredLibnames` key of its [`@sasjslint`](#per-file-overrides) header block, which is the per-file escape hatch for the rule.

- Default: []
- Used by: `noUnusedLibnames`

### ignoredMacros

The macros that `noUndeclaredMacros` treats as declared. `%webout` is the common entry: `sasjs compile` injects it into every service and no macro file provides it - `sasjs/core` carries `mv_webout` / `ms_webout` / `mm_webout`, never `webout` - so there is nothing to declare, and `sasjs lint fix` would write an `@li webout.sas` the compiler cannot find. That is why `webout` is the default entry:

```json
{
  "ignoredMacros": ["webout"]
}
```

The names are matched case-insensitively. A macro listed here is not reported, and `sasjs lint fix` does not add it to a header. An explicit list replaces the default, so `"ignoredMacros": []` reports `webout` like any other undeclared name.

A single file can add to this list with the `ignoredMacros` key of its [`@sasjslint`](#per-file-overrides) header block.

- Default: ["webout"]
- Used by: `noUndeclaredMacros`

### indentationMultiple

This will check each line to ensure that the count of leading spaces can be divided cleanly by this multiple.

- Default: 2
- Severity: WARNING

### lineEndings

This setting ensures the line endings in a file conform to the configured type. Possible values are `lf`, `crlf` and `off` (off means rule is set to be off). If the value is missing, null or undefined then the check would also be switched off (no default applied).

The last line is a line like any other: when this setting is `lf` or `crlf`, a file whose final line has no terminator is reported, and the formatter appends the missing terminator (`\r\n` when the setting is `crlf`, `\n` when it is `lf`). A project that wants the file end checked therefore sets this setting to `lf` or `crlf`; leaving it `off` means no line ending checks at all.

- Default: "off"
- Severity: WARNING

Example (to enforce unix line endings):

```json
{
  "lineEndings": "lf"
}
```

### lowerCaseFileNames

On *nix systems, it is imperative that autocall macros are in lowercase. When sharing code between windows and *nix systems, the difference in case sensitivity can also be a cause of lost developer time. For this reason, we recommend that sas filenames are always lowercase.

- Default: true
- Severity: WARNING

### maxDataLineLength

Datalines can be very wide, so to avoid the need to increase `maxLineLength` for the entire project, it is possible to raise the line length limit for the data records only. On a related note, as a developer, you should also be aware that code submitted in batch may have a default line length limit which is lower than you expect. See this [usage note](https://support.sas.com/kb/15/883.html) (and thanks to [sasutils for reminding us](https://github.com/sasjs/lint/issues/47#issuecomment-1064340104)).

This feature will work for the following statements:

- cards
- cards4
- datalines
- datalines4
- parmcards
- parmcards4

The `maxDataLineLength` setting is always the _higher_ of `maxDataLineLength` and `maxLineLength` (if you set a lower number, it is ignored).

- Default: 80
- Severity: WARNING

See also:

- [hasDoxygenHeader](#hasdoxygenheader)
- [maxHeaderLineLength](#maxheaderlinelength)
- [maxLineLength](#maxlinelength)

### maxHeaderLineLength

In a program header it can be necessary to insert items such as URLs or markdown tables, that cannot be split over multiple lines. To avoid the need to increase `maxLineLength` for the entire project, it is possible to raise the line length limit for the header section only.

The `maxHeaderLineLength` setting is always the _higher_ of `maxHeaderLineLength` and `maxLineLength` (if you set a lower number, it is ignored).

- Default: 80
- Severity: WARNING

See also:

- [hasDoxygenHeader](#hasdoxygenheader)
- [maxDataLineLength](#maxdatalinelength)
- [maxLineLength](#maxlinelength)

### maxLineLength

Code becomes far more readable when line lengths are short. The most compelling reason for short line lengths is to avoid the need to scroll when performing a side-by-side 'compare' between two files (eg as part of a GIT feature branch review). A longer discussion on optimal code line length can be found [here](https://stackoverflow.com/questions/578059/studies-on-optimal-code-width)

In batch mode, long SAS code lines may also be truncated, causing hard-to-detect errors.

We strongly recommend a line length limit, and set the bar at 80. To turn this feature off, set the value to 0.

- Default: 80
- Severity: WARNING

See also:

- [maxDataLineLength](#maxdatalinelength)
- [maxHeaderLineLength](#maxheaderlinelength)

### minMacroNameLength

The shortest macro name the linter will treat as a macro name, and the shortest a file may define.

It exists because other languages write a percentage sign that reads as a macro call. The default of three is set by what those look like: a conversion is one character (`%s(`, `%d(`, `%x(`), a length modifier makes it two (`%ld(`, `%lu(`, `%Lf(`), and a macro name that anyone documents is longer than either - so three clears the specifiers a format string actually contains and still admits every real name. [`noUndeclaredMacros`](#noundeclaredmacros) applies the floor when it reads invocations, so a short "call" is not reported, and this rule reports a definition that short - so a macro the scanner could not see is caught where it is written rather than silently ignored. [`noUnusedMacros`](#nounusedmacros) deliberately does not apply it: over-counting a use keeps a declaration, while under-counting one has the formatter delete it, so every parsed name counts as a use.

The default covers `%s(` and the length-modifier forms such as `%ld(`. A longer conversion - `%lld(` - still reads as a name, and a file that formats numbers that way raises the floor for itself (`@sasjslint {"minMacroNameLength": 4}`), lists those names in [`ignoredMacros`](#ignoredmacros), or switches the rule off for itself. The linter does not try to parse a format string: the residue is a handful of names in a handful of files, and a specifier table would have to track every dialect that writes one.

A definition that lives inside a multi-line double-quoted string - a template the file writes out rather than code it runs - is read as a definition, because the macro parser reads lines rather than tracking quotes. A single-quoted template cannot span lines in SAS and is not read that way. That file raises the floor for itself or switches the rule off.

Short macro names are legal SAS, but they are not documentable: `%macro s();` reads as a format specifier in every context a reader meets it. To turn the floor off, set the value to 1, which also returns `noUndeclaredMacros` to reading single-character names.

- Default: 3
- Severity: WARNING

### noBannedStrings

Reports every line that contains one of the strings in [`bannedStrings`](#bannedstrings), anywhere in the line - in a comment, in a string literal, or in code, because the text is read the way a person or a log scanner reads it rather than as SAS tokens.

The point is the log. A comment such as `/* returns the error message as text */` contains `error `, and so does a real `ERROR:` line, so a grep of the SAS log - and any log scanner built on one, including the checks people run before they look at a job - returns the comment along with the failure. The same applies to a `%put` that copies a sentence out of the documentation. Keeping those words out of the source means a match in the log is a message that came from somewhere real.

Three boundaries are deliberate. The line that carries a `@sasjslint` override is configuration rather than prose, so a file that adds a banned string does not report its own setting. Source data is left alone: a `datalines` payload may hold the text `error ` in a value, and that is data rather than something a developer can reword. And matching is case insensitive, so `Error`, `ERROR` and `error` are the same banned string; the diagnostic quotes the text as written. There is no setting to make it case sensitive: the words being caught are log lookalikes, and the log does not preserve the case an author typed either.

The entry is matched as text, so it is not anchored to a word boundary. `saserror = 1` therefore satisfies `"error "`, because the identifier ends with the word and the space before the `=` is the trailing space the entry asks for. Listing `"error "` is what keeps `errors` and `error_flag` out, and every default entry is written the same way for that reason.

The rule is a warning by default. A single file can switch it off or downgrade it with a `@sasjslint` block in its header, which is the usual way to keep a legacy program out of scope:

```sas
/**
  @file
  @brief Legacy job, comments left as written
  @sasjslint {"noBannedStrings": false}
**/
```

- Default: true
- Severity: WARNING

### noEncodedPasswords

This rule will highlight any rows that contain a `{sas00X}` type password, or `{sasenc}`. These passwords (especially 001 and 002) are NOT secure, and should NEVER be pushed to source control or saved to the filesystem without special permissions applied.

- Default: true
- Severity: ERROR

### noGremlins

Capture zero-width whitespace and other non-standard characters. The logic is borrowed from the [VSCode Gremlins Extension](https://github.com/nhoizey/vscode-gremlins) - if you are looking for more advanced gremlin zapping capabilities, we highly recommend to use their extension instead.

The list of characters can be found in this file: [https://github.com/sasjs/lint/blob/main/src/utils/gremlinCharacters.ts](https://github.com/sasjs/lint/blob/main/src/utils/gremlinCharacters.ts)

- Default: true
- Severity: WARNING

### noNestedCommentsInHeader

A doxygen header is a SAS block comment, and SAS block comments do not nest: the first close marker ends the comment. A `/* ... */` inside the header therefore closes the header early, and the rest of it - `@param` lines, and any code in a usage example - is compiled as SAS. Header text that holds `/*/`, such as a glob like `src/*/file.sas`, ends the header the same way.

This rule reports such a header as a warning. `sasjs compile` fails on the truncation (sasjs/utils#288), so the rule surfaces it in the editor rather than in the build; set `severityLevel` to `error` to make `sasjs lint` fail on it as well.

Two boundaries are deliberate. Only the header a file opens with is inspected, which is the one `sasjs compile` reads - a file that opens with code has no header to truncate, and `hasDoxygenHeader` covers that shape. And the header's end is identified by its `**/` terminator standing alone on its line, so a header closed with a plain `*/` is not inspected: nothing there says the header was meant to continue. [`hasDoxygenHeader`](#hasdoxygenheader) reports that closing style and its fix writes the `**/` form, which is what puts the header back in view here. The same bound has one cost worth knowing: a truncated header whose own text holds a line-leading `/**` is not reported, because that opener is indistinguishable from a second header in the same file.

- Default: true
- Severity: WARNING

### noNestedMacros

Where macros are defined inside other macros, they are recompiled every time the outer macro is invoked. Hence, it is widely considered inefficient, and bad practice, to nest macro definitions.

- Default: true
- Severity: WARNING

### noSingleAsteriskComments

SAS supports a comment statement that begins with a single asterisk and runs to the next semicolon, for example `* some text;`. This style is easy to mistype - a missing terminating semicolon turns the rest of the program into a comment - and it cannot be nested, so the SASjs framework recommends block comments (`/* ... */`) instead.

This rule reports a warning for each comment statement that begins with a single asterisk. It ignores asterisks inside quoted strings, `%str()` / `%nrstr()` arguments, macro comments (`%* ... ;`), data sections (`datalines` / `cards`), `proc lua` / `proc groovy` submit blocks and arithmetic expressions (`a * b`, `b ** a`, `select * from`), so it only fires on genuine comment statements.

- Default: false
- Severity: WARNING

Example:

```json
{
  "noSingleAsteriskComments": true
}
```

### noSpacesInFileNames

The 'beef' we have with spaces in filenames is twofold:

- Loss of the in-built ability to 'click' a filepath and have the file open automatically
- The need to quote such filepaths in order to use them in CLI commands

In addition, when such files are used in URLs, they are often padded with a messy "%20" type quotation. And of course, for macros (where the macro should match the filename) then spaces are simply not valid.

- Default: true
- Severity: WARNING

As an alternative (or in addition) to using a lint rule, you can also set the following in your `.gitignore` file to prevent files with spaces from being committed:

```
# prevent files/folders with spaces
**\ **
```

### noTabs

Whilst there are some arguments for using tabs (such as the ability to set your own indentation width, and to reduce character count) there are many, many, many developers who think otherwise. We're in that camp. Sorry (not sorry).

- Alias: noTabIndentation
- Default: true
- Severity: WARNING

### noTrailingSpaces

This will highlight lines with trailing spaces. Trailing spaces serve no useful purpose in a SAS program.

- Default: true
- severity: WARNING

### noUndeclaredMacros

SASjs programs declare the macros they use in the `<h4> SAS Macros </h4>` section of the header, so that the compiler can assemble the job before it runs. This rule reports a warning for each macro that a file invokes without declaring it - either by defining it in the file, or by listing it in the `<h4> SAS Macros </h4>` section. That is the only header list `sasjs compile` reads, so it is the only one that makes a macro available to the job; entries anywhere else in the header do not count.

The macros that ship with SAS (`%scan`, `%index`, `%sysfunc` and the other macro functions, along with the macro language keywords such as `%if`, `%then` and `%do`) are always considered declared, so they are never reported. That list is generated from the `macroStatements` and `macroFunctions` groups of `@sasjs/sas-language` (`npm run generate:macros`), so it tracks the SAS language data rather than being maintained here. Macros made available through the `SASAUTOS` system option are not visible to the linter and will be reported - list them in [`ignoredMacros`](#ignoredmacros), which carries `webout` by default.

An invocation written inside the argument of `%str` / `%nrstr` is not reported. A file masks a trigger to print it as often as to defer it, and nothing runs at that point, so a warning there would land on text that may never be code. [`noUnusedMacros`](#nounusedmacros) counts such a name as a use, so the deferred form - `%mp_abort(iftrue=%str(%mf_existds(work.x)=1))` - satisfies the declaration it depends on without demanding one.

A name written inside a single-quoted string is reported too, for the same reason as the masking case in reverse: the string is usually a program the file submits, so the macro has to be available when it runs. Text in a string is not always code, though, so two tests keep the noise down. A name shorter than [`minMacroNameLength`](#minmacronamelength) is never reported (`%s(`, `%d(`, `%x(`), and a name inside a string counts only when an opening parenthesis follows it - a generated program calls a macro that way, while a SQL LIKE pattern (`'%abc%'`) or a conversion specifier has nothing after the name. The parenthesis test sits with [`hasMacroParentheses`](#hasmacroparentheses), which requires every definition in the codebase to declare one. A template carrying the macros that its generated program declares for itself goes in [`ignoredMacros`](#ignoredmacros) or has the rule switched off for that file with a `@sasjslint` block.

The warning is resolved by adding the macro name to the header. Running `sasjs lint fix` (or saving in the SASjs VS Code extension with `formatOnSave`) adds the missing macros automatically, as a unique list sorted alphabetically.

- Default: true
- Severity: WARNING

### noUnusedLibnames

Assigning a libref opens a connection, and on a remote engine that costs time, so a `LIBNAME` statement that a file never uses is worth knowing about.

This rule reports a warning for each libref a file assigns and never mentions again. A mention is any occurrence of the libref outside the `LIBNAME` statement, which covers the indirect forms SAS accepts as well as two-level names:

```sas
libname outData "&dirOut.";
libname TESTWORK "&work";
libname path2 "&sasjswork/path2";

libText = pathname("outData", "L");        /* the libref as a string */
%let dir = %sysfunc(pathname(TESTWORK));   /* the libref unquoted */
proc format library=path2;                 /* the libref as an option value */
options insert=(fmtsearch=(path1 path2));
```

The test is deliberately generous, because a use that is missed becomes a false positive. A `LIBNAME` statement that deassigns (`libname foo;`), clears (`libname foo clear;`) or reports (`libname foo list;`) assigns nothing, so it is never reported - and it counts as a use, since it refers to a libref assigned elsewhere. The reporting form `libname _all_ list;` names no libref. A libref built at runtime (`libname &lib;`) is not a literal, so there is nothing to check.

The rule is **off by default**. A `.sas` file is not a complete job, so a libref it assigns can be used by:

- an `autoexec.sas` that pre-assigns librefs
- macros, functions or `%include`d programs that the linter never sees
- another file in the same flow - in the SASjs framework, a secondary artefact

Enable it per project with `"noUnusedLibnames": true`, and list the librefs it should leave alone in [`ignoredLibnames`](#ignoredlibnames). An individual file can exempt its own librefs, or enable the rule for itself, in its `@sasjslint` header block:

```sas
/**
  @file
  @brief Loads the settlement feed

  <h4> SAS Macros </h4>
  @li mf_trim.sas

  @sasjslint {"noUnusedLibnames": true, "ignoredLibnames": ["outData"]}
**/
```

There is no fix. `sasjs lint fix` leaves the file alone, because the formatter cannot see the rest of the job - removing the statement could break it, and silencing every warning into the ignore list would make the rule pointless.

- Default: false
- Severity: WARNING

### noUnusedMacros

The counterpart of `noUndeclaredMacros`. This rule reports a warning for each macro listed under `<h4> SAS Macros </h4>` that the file itself never invokes, which usually means the header is out of date.

A macro can be referenced indirectly - for example by another macro in the dependency chain, or through a dynamic `%&macro` call - without appearing as a direct invocation in the file, so the warning is advisory.

An invocation written inside the argument of `%str` / `%nrstr` counts as a use. That text is data while the masking function runs, but its caller normally unquotes it - `%mp_abort(iftrue=%str(%mf_existds(work.x)=1))` resolves `%mf_existds` when `%mp_abort` evaluates the condition - so the declaration is a dependency of the file, and treating it as unused would have the formatter delete it.

An invocation written inside a single-quoted string counts as a use as well. SAS resolves no macro trigger there, so the text is data while the string is built - but code that generates code submits it later: `call execute('%mf_mkdir('!!path!!')')` runs the macro when the DATA step executes, and a program written to a fileref and `%inc`ed runs it then. Counting it as unused would report a declaration the file needs, and the formatter would delete it.

Running `sasjs lint fix` (or saving in the SASjs VS Code extension with `formatOnSave`) removes the unused entries from the header. Together with `noUndeclaredMacros`, this leaves the `<h4> SAS Macros </h4>` section listing exactly the macros the file uses. The pass that reads the list also writes each entry back as `@li <macro>.sas` at the section's indentation, in place and without re-spacing the header, so a mistyped tag (`@il`) is repaired even when no entry is removed.

- Default: true
- Severity: WARNING

### strictMacroDefinition

This will check the syntax of a macro definition, and warn about two things:

- a parameter name that contains a space, as in `%macro myMacro(my var);`
- an option that SAS does not recognise, as in `%macro myMacro()/nonsense;`

The options SAS accepts are `CMD`, `DES`, `MINDELIMITER`, `MINOPERATOR`, `NOMINOPERATOR`, `PARMBUFF`, `SECURE`, `NOSECURE`, `STMT`, `SOURCE`, `SRC` and `STORE`.

- Default: true
- Severity: WARNING

## severityLevel

This setting allows the default severity to be adjusted. This is helpful when running the lint in a pipeline or git hook. Simply list the rules you would like to adjust along with the desired setting ("warn" or "error"), eg as follows:

```json
{
  "noTrailingSpaces": true,
  "hasDoxygenHeader": true,
  "maxLineLength": 100,
  "severityLevel": {
    "hasDoxygenHeader": "warn",
    "maxLineLength": "error",
    "noTrailingSpaces": "error"
  }
}
```

- "warn" - show warning in the log (doesn’t affect exit code)
- "error" - show error in the log (exit code is 1 when triggered)

# SAS Formatter

A formatter will automatically apply rules when you hit SAVE, which can save a LOT of time.

We've already implemented the following rules:

- Add the macro name to the %mend statement
- Add a doxygen header template if none exists
- Add undeclared macros to the `<h4> SAS Macros </h4>` section
- Remove unused macros from the `<h4> SAS Macros </h4>` section
- Remove trailing spaces
- Fix line endings, including adding a missing final newline when [`lineEndings`](#lineendings) is configured

The formatter only fixes rules that are in your configuration, so a rule that is off neither warns nor is repaired.

# Contributing

Development instructions, the checklist for adding a rule, and the formatter fixes still to be built live in [CONTRIBUTING.md](.github/CONTRIBUTING.md).

SASjs is an open source framework! Contributions are welcomed. If you would like to see a feature, because it would be useful in your project, but you don't have the requisite (Typescript) experience - then how about you engage us on a short project and we build it for you?

Contact [Allan Bowe](https://www.linkedin.com/in/allanbowe/) for further details.

# Further resources

- Using the linter on terminal: https://vid.4gl.io/w/vmJspCjcBoc5QtzwZkZRvi
- Longer intro to sasjs lint: https://vid.4gl.io/w/nDtkQFV1E8rtaa2BuM6U5s
- CLI docs: https://cli.sasjs.io/lint

# Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Carus11"><img src="https://avatars.githubusercontent.com/u/4925828?v=4?s=100" width="100px;" alt="Carus Kyle"/><br /><sub><b>Carus Kyle</b></sub></a><br /><a href="#ideas-Carus11" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/allanbowe"><img src="https://avatars.githubusercontent.com/u/4420615?v=4?s=100" width="100px;" alt="Allan Bowe"/><br /><sub><b>Allan Bowe</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Aallanbowe" title="Reviewed Pull Requests">👀</a> <a href="#video-allanbowe" title="Videos">📹</a> <a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.erudicat.com/"><img src="https://avatars.githubusercontent.com/u/25773492?v=4?s=100" width="100px;" alt="Yury Shkoda"/><br /><sub><b>Yury Shkoda</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Tests">⚠️</a> <a href="#projectManagement-YuryShkoda" title="Project Management">📆</a> <a href="#video-YuryShkoda" title="Videos">📹</a> <a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://krishna-acondy.io/"><img src="https://avatars.githubusercontent.com/u/2980428?v=4?s=100" width="100px;" alt="Krishna Acondy"/><br /><sub><b>Krishna Acondy</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=krishna-acondy" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=krishna-acondy" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Akrishna-acondy" title="Reviewed Pull Requests">👀</a> <a href="#infra-krishna-acondy" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#platform-krishna-acondy" title="Packaging/porting to new platform">📦</a> <a href="#maintenance-krishna-acondy" title="Maintenance">🚧</a> <a href="#content-krishna-acondy" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/saadjutt01"><img src="https://avatars.githubusercontent.com/u/8914650?v=4?s=100" width="100px;" alt="Muhammad Saad "/><br /><sub><b>Muhammad Saad </b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Asaadjutt01" title="Reviewed Pull Requests">👀</a> <a href="#mentoring-saadjutt01" title="Mentoring">🧑‍🏫</a> <a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sabhas"><img src="https://avatars.githubusercontent.com/u/82647447?v=4?s=100" width="100px;" alt="Sabir Hassan"/><br /><sub><b>Sabir Hassan</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=sabhas" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=sabhas" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Asabhas" title="Reviewed Pull Requests">👀</a> <a href="#ideas-sabhas" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/medjedovicm"><img src="https://avatars.githubusercontent.com/u/18329105?v=4?s=100" width="100px;" alt="Mihajlo Medjedovic"/><br /><sub><b>Mihajlo Medjedovic</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=medjedovicm" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=medjedovicm" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Amedjedovicm" title="Reviewed Pull Requests">👀</a> <a href="#infra-medjedovicm" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/VladislavParhomchik"><img src="https://avatars.githubusercontent.com/u/83717836?v=4?s=100" width="100px;" alt="Vladislav Parhomchik"/><br /><sub><b>Vladislav Parhomchik</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=VladislavParhomchik" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3AVladislavParhomchik" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/McGwire-Jones"><img src="https://avatars.githubusercontent.com/u/51411005?v=4?s=100" width="100px;" alt="McGwire-Jones"/><br /><sub><b>McGwire-Jones</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=McGwire-Jones" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
