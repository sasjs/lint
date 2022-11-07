[![License](https://img.shields.io/apm/l/atomic-design-ui.svg)](/LICENSE)
![GitHub top language](https://img.shields.io/github/languages/top/sasjs/lint)
[![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/sasjs/lint)](https://github.com/sasjs/lint/issues?q=is%3Aissue+is%3Aclosed)
[![GitHub issues](https://img.shields.io/github/issues-raw/sasjs/lint)](https://github.com/sasjs/lint/issues)
![total lines](https://tokei.rs/b1/github/sasjs/lint)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/sasjs/lint)

# SAS Code linting and formatting

Our goal is to help SAS developers everywhere spend less time on code reviews, bug fixing and arguing about standards - and more time delivering extraordinary business value.

## Linting
@sasjs/lint is used by the following products:

  * [@sasjs/vscode-extension](https://github.com/sasjs/vscode-extension) - just download SASjs in the VSCode marketplace, and select view/problems in the menu bar.
  * [@sasjs/cli](https://cli.sasjs.io/lint) - run `sasjs lint` to get a list of all files with their problems, along with line and column indexes.

Configuration is via a `.sasjslint` file with the following structure (these are also the defaults if no .sasjslint file is found):

```json
{
    "noEncodedPasswords": true,
    "hasDoxygenHeader": true,
    "hasMacroNameInMend": true,
    "hasMacroParentheses": true,
    "ignoreList": [
      "sajsbuild/",
      "sasjsresults/"
    ],
    "indentationMultiple": 2,
    "lowerCaseFileNames": true,
    "maxLineLength": 80,
    "noNestedMacros": true,
    "noSpacesInFileNames": true,
    "noTabIndentation": true,
    "noTrailingSpaces": true,
    "defaultHeader": "/**{lineEnding}  @file{lineEnding}  @brief <Your brief here>{lineEnding}  <h4> SAS Macros </h4>{lineEnding}**/"
}
```

### SAS Lint Settings

#### defaultHeader

This sets the default program header - applies when a SAS program does NOT begin with `/**`.  The default header is as follows:

```sas
/**
  @file
  @brief <Your brief here>
  <h4> SAS Macros </h4>
**/
```

The default header is automatically applied when running `sasjs lint fix` in the SASjs CLI, or by hitting "save" when using the SASjs VS Code extension.  If creating a new value, use `{lineEnding}` instead of `\n`, eg as follows:

```json
{
  "defaultHeader": "/**{lineEnding}  @file{lineEnding}  @brief Our Company Brief{lineEnding}**/"
}
```

#### noEncodedPasswords

This will highlight any rows that contain a `{sas00X}` type password, or `{sasenc}`.  These passwords (especially 001 and 002) are NOT secure, and should NEVER be pushed to source control or saved to the filesystem without special permissions applied.

* Default:  true
* Severity: ERROR

#### hasDoxygenHeader
The SASjs framework recommends the use of Doxygen headers for describing all types of SAS program.  This check will identify files where a doxygen header does not begin in the first line.

* Default:  true
* Severity: WARNING

#### hasMacroNameInMend
The addition of the macro name in the `%mend` statement is optional, but can approve readability in large programs.  A discussion on this topic can be found [here](https://www.linkedin.com/posts/allanbowe_sas-sasapps-sasjs-activity-6783413360781266945-1-7m).  The default setting was the result of a poll with over 300 votes.

* Default:  true
* Severity: WARNING

#### hasMacroParentheses
As per the example [here](https://github.com/sasjs/lint/issues/20), macros defined without parentheses cause problems if that macro is ever extended (it's not possible to reliably extend that macro without potentially breaking some code that has used the macro).  It's better to always define parentheses, even if they are not used.  This check will also throw a warning if there are spaces between the macro name and the opening parenthesis.

* Default:  true
* Severity: WARNING

#### ignoreList
There may be specific files (or folders) that are not good candidates for linting.  Simply list them in this array and they will be ignored.  In addition, any files in the project `.gitignore` file will also be ignored.

#### indentationMultiple
This will check each line to ensure that the count of leading spaces can be divided cleanly by this multiple.

* Default:  2
* Severity: WARNING

#### lowerCaseFileNames
On *nix systems, it is imperative that autocall macros are in lowercase.  When sharing code between windows and *nix systems, the difference in case sensitivity can also be a cause of lost developer time.  For this reason, we recommend that sas filenames are always lowercase.

* Default: true
* Severity: WARNING

#### maxLineLength
Code becomes far more readable when line lengths are short.  The most compelling reason for short line lengths is to avoid the need to scroll when performing a side-by-side 'compare' between two files (eg as part of a GIT feature branch review).  A longer discussion on optimal code line length can be found [here](https://stackoverflow.com/questions/578059/studies-on-optimal-code-width)

In batch mode, long SAS code lines may also be truncated, causing hard-to-detect errors.

We strongly recommend a line length limit, and set the bar at 80.  To turn this feature off, set the value to 0.

* Default: 80
* Severity: WARNING

#### noNestedMacros
Where macros are defined inside other macros, they are recompiled every time the outer macro is invoked.  Hence, it is widely considered inefficient, and bad practice, to nest macro definitions.

* Default:  true
* Severity: WARNING

#### noSpacesInFileNames
The 'beef' we have with spaces in filenames is twofold:

* Loss of the in-built ability to 'click' a filepath and have the file open automatically
* The need to quote such filepaths in order to use them in CLI commands

In addition, when such files are used in URLs, they are often padded with a messy "%20" type quotation.  And of course, for macros (where the macro should match the filename) then spaces are simply not valid.

* Default:  true
* Severity: WARNING

#### noTabIndentation
Whilst there are some arguments for using tabs to indent (such as the ability to set your own indentation width, and to reduce character count) there are many, many, many developers who think otherwise.  We're in that camp.  Sorry (not sorry).

* Default:  true
* Severity: WARNING

#### noTrailingSpaces
This will highlight lines with trailing spaces.  Trailing spaces serve no useful purpose in a SAS program.

* Default:  true
* severity: WARNING

### Upcoming Linting Rules:

* `noTabs` -> does what it says on the tin
* `noGremlins` -> identifies all invisible characters, other than spaces / tabs / line endings.  If you really need that bell character, use a hex literal!
* `lineEndings` -> set a standard line ending, such as LF or CRLF

## SAS Formatter

A formatter will automatically apply rules when you hit SAVE, which can save a LOT of time.

We've already implemented the following rules:

* Add the macro name to the %mend statement
* Add a doxygen header template if none exists
* Remove trailing spaces

We're looking to implement the following rules:

* Change tabs to spaces
* zap gremlins
* fix line endings

We are also investigating some harder stuff, such as automatic indentation and code layout

## Sponsorship & Contributions

SASjs is an open source framework!  Contributions are welcomed.  If you would like to see a feature, because it would be useful in your project, but you don't have the requisite (Typescript) experience - then how about you engage us on a short project and we build it for you?

Contact [Allan Bowe](https://www.linkedin.com/in/allanbowe/) for further details.

## SAS 9 Health check

The SASjs Linter (and formatter) is a great way to de-risk and accelerate the delivery of SAS code into production environments.  However, code is just one part of a SAS estate.  If you are running SAS 9, you may be interested to know what 'gremlins' are lurking in your SAS 9 system.  Maybe you are preparing for a migration.  Maybe you are preparing to hand over the control of your environment.  Either way, an assessment of your existing system would put minds at rest and pro-actively identify trouble spots.

The SAS 9 Health Check is a 'plug & play' product, that uses the [SAS 9 REST API](https://sas9api.io) to run hundreds of metadata and system checks to identify common problems.  The checks are non-invasive, and becuase it is a client app, there is NOTHING TO INSTALL on your SAS server.  We offer this assessment for a low fixed fee, and if you engage our (competitively priced) services to address the issues we highlight, then the assessment is free.

Contact [Allan Bowe](https://www.linkedin.com/in/allanbowe/) for further details.



## Contributors ✨
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-8-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/Carus11"><img src="https://avatars.githubusercontent.com/u/4925828?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Carus Kyle</b></sub></a><br /><a href="#ideas-Carus11" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/allanbowe"><img src="https://avatars.githubusercontent.com/u/4420615?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Allan Bowe</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Aallanbowe" title="Reviewed Pull Requests">👀</a> <a href="#video-allanbowe" title="Videos">📹</a> <a href="https://github.com/sasjs/lint/commits?author=allanbowe" title="Documentation">📖</a></td>
    <td align="center"><a href="https://www.erudicat.com/"><img src="https://avatars.githubusercontent.com/u/25773492?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yury Shkoda</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Tests">⚠️</a> <a href="#projectManagement-YuryShkoda" title="Project Management">📆</a> <a href="#video-YuryShkoda" title="Videos">📹</a> <a href="https://github.com/sasjs/lint/commits?author=YuryShkoda" title="Documentation">📖</a></td>
    <td align="center"><a href="https://krishna-acondy.io/"><img src="https://avatars.githubusercontent.com/u/2980428?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Krishna Acondy</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=krishna-acondy" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=krishna-acondy" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Akrishna-acondy" title="Reviewed Pull Requests">👀</a> <a href="#infra-krishna-acondy" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#platform-krishna-acondy" title="Packaging/porting to new platform">📦</a> <a href="#maintenance-krishna-acondy" title="Maintenance">🚧</a> <a href="#content-krishna-acondy" title="Content">🖋</a></td>
    <td align="center"><a href="https://github.com/saadjutt01"><img src="https://avatars.githubusercontent.com/u/8914650?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Muhammad Saad </b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Asaadjutt01" title="Reviewed Pull Requests">👀</a> <a href="#mentoring-saadjutt01" title="Mentoring">🧑‍🏫</a> <a href="https://github.com/sasjs/lint/commits?author=saadjutt01" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/sabhas"><img src="https://avatars.githubusercontent.com/u/82647447?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sabir Hassan</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=sabhas" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=sabhas" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Asabhas" title="Reviewed Pull Requests">👀</a> <a href="#ideas-sabhas" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/medjedovicm"><img src="https://avatars.githubusercontent.com/u/18329105?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mihajlo Medjedovic</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=medjedovicm" title="Code">💻</a> <a href="https://github.com/sasjs/lint/commits?author=medjedovicm" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3Amedjedovicm" title="Reviewed Pull Requests">👀</a> <a href="#infra-medjedovicm" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/VladislavParhomchik"><img src="https://avatars.githubusercontent.com/u/83717836?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Vladislav Parhomchik</b></sub></a><br /><a href="https://github.com/sasjs/lint/commits?author=VladislavParhomchik" title="Tests">⚠️</a> <a href="https://github.com/sasjs/lint/pulls?q=is%3Apr+reviewed-by%3AVladislavParhomchik" title="Reviewed Pull Requests">👀</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
