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
    "hasMacroNameInMend": false,
    "hasMacroParentheses": true,
    "indentationMultiple": 2,
    "lowerCaseFileNames": true,
    "maxLineLength": 80,
    "noNestedMacros": true,
    "noSpacesInFileNames": true,
    "noTabIndentation": true,
    "noTrailingSpaces": true
}
```

### SAS Lint Settings

#### noEncodedPasswords

This will highlight any rows that contain a `{sas00X}` type password, or `{sasenc}`.  These passwords (especially 001 and 002) are NOT secure, and should NEVER be pushed to source control or saved to the filesystem without special permissions applied.

Severity: ERROR

#### hasDoxygenHeader
The SASjs framework recommends the use of Doxygen headers for describing all types of SAS program.  This check will identify files where a doxygen header does not begin in the first line.

Severity: WARNING

#### hasMacroNameInMend
The addition of the macro name in the `%mend` statement is optional, but can approve readability in large programs.  A discussion on this topic can be found [here](https://www.linkedin.com/posts/allanbowe_sas-sasapps-sasjs-activity-6783413360781266945-1-7m).  The default setting will be the result of a popular vote by around 300 people.  Default:  false (for now)

Severity: WARNING

#### hasMacroParentheses
As per the example [here](https://github.com/sasjs/lint/issues/20), macros defined without parentheses cause problems if that macro is ever extended (it's not possible to reliably extend that macro without potentially breaking some code that has used the macro).  It's better to always define parentheses, even if they are not used.  Default:  true

Severity: WARNING

#### indentationMultiple
This will check each line to ensure that the count of leading spaces can be divided cleanly by this multiple.

Severity: WARNING

#### lowerCaseFileNames
On *nix systems, it is imperative that autocall macros are in lowercase.  When sharing code between windows and *nix systems, the difference in case sensitivity can also be a cause of lost developer time.  For this reason, we recommend that sas filenames are always lowercase.

Severity: WARNING

#### maxLineLength
Code becomes far more readable when line lengths are short.  The most compelling reason for short line lengths is to avoid the need to scroll when performing a side-by-side 'compare' between two files (eg as part of a GIT feature branch review).  A longer discussion on optimal code line length can be found [here](https://stackoverflow.com/questions/578059/studies-on-optimal-code-width)

In batch mode, long SAS code lines may also be truncated, causing hard-to-detect errors.  

For this reason we strongly recommend a line length limit, and we set the bar at 80.  To turn this feature off, set the value to 0.

Severity: WARNING

#### noNestedMacros
Where macros are defined inside other macros, they are recompiled every time the outer maro is invoked.  Hence, it is widely considered inefficient, and bad practice, to nest macro definitions.  Default:  true

Severity: WARNING

#### noSpacesInFileNames
The 'beef' we have with spaces in filenames is twofold:

* Loss of the in-built ability to 'click' a filepath and have the file open automatically
* The need to quote such filepaths in order to use them in CLI commands

In addition, when such files are used in URLs, they are often padded with a messy "%20" type quotation.  And of course, for macros (where the macro should match the filename) then spaces are simply not valid.

Severity: WARNING

#### noTabIndentation
Whilst there are some arguments for using tabs to indent (such as the ability to set your own indentation width, and to save on characters) there are many, many, many developers who think otherwise.  We're in that camp.  Sorry (not sorry).

Severity: WARNING

#### noTrailingSpaces
This will highlight lines with trailing spaces.  Trailing spaces serve no useful purpose in a SAS program.

severity: WARNING

### Upcoming Linting Rules:

* `noTabs` -> does what it says on the tin 
* `noGremlins` -> identifies all invisible characters, other than spaces / tabs / line endings.  If you really need that bell character, use a hex literal!
* `hasMendName` -> show the macro name in the %mend statement
* `noNestedMacros` -> highlight where macros are defined inside other macros 
* `lineEndings` -> set a standard line ending, such as LF or CRLF

## SAS Formatter

A formatter will automatically apply rules when you hit SAVE, which can save a LOT of time.

We're looking to implement the following rules:

* Remove trailing spaces
* Change tabs to spaces 
* Add the macro name to the %mend statement 
* Add a doxygen header template if none exists 

Later we will investigate some harder stuff, such as automatic indentation and code layout

## Sponsorship & Contributions

SASjs is an open source framework!  Contributions are welcomed.  If you would like to see a feature, because it would be useful in your project, but you don't have the requisite (Typescript) experience - then how about you engage us on a short project and we build it for you?

Contact [Allan Bowe](https://www.linkedin.com/in/allanbowe/) for further details.

## SAS 9 Health check

The SASjs Linter (and formatter) is a great way to de-risk and accelerate the delivery of SAS code into production environments.  However, code is just one part of a SAS estate.  If you are running SAS 9, you may be interested to know what 'gremlins' are lurking in your system.  Maybe you are preparing for a migration.  Maybe you are preparing to hand over the control of your environment.  Either way, an assessment of your existing system would put minds at rest and pro-actively identify trouble spots.

The SAS 9 Health Check is a 'plug & play' product, that uses the [SAS 9 REST API](https://sas9api.io) to run hundreds of metadata and system checks to identify common problems.  The checks are non-invasive, and becuase it is a client app, there is NOTHING TO INSTALL on your SAS server.  We offer this assessment for a low fixed fee, and if you engage our (competitively priced) services to address the issues we highlight, then the assessment is free.

Contact [Allan Bowe](https://www.linkedin.com/in/allanbowe/) for further details.


