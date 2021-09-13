# Contributing

Contributions to `@sasjs/lint` are very welcome!
Please fill in the pull request template and make sure that your code changes are adequately covered with tests when making a PR.

## Architecture

This project implements a number of rules for SAS projects and code. There are three types of rules:
_ File rules - rules applied at the file level
_ Line rules - rules applied to each line of a file \* Path rules - rules applied to paths and file names

When implementing a new rule, place it in the appropriate folder for its type.
Please also make sure to export it from the `index.ts` file in that folder.

The file for each rule typically exports an object that conforms to the `LintRule` interface.
This means it will have a `type`, `name`, `description` and `message` at a minimum.

File, line and path lint rules also have a `test` property.
This is a function that will run a piece of logic against the supplied item and produce an array of `Diagnostic` objects.
These objects can be used in the consuming application to display the problems in the code.

With some lint rules, we can also write logic that can automatically fix the issues found.
These rules will also have a `fix` property, which is a function that takes the original content -
either a line or the entire contents of a file, and returns the transformed content with the fix applied.

## Testing

Testing is one of the most important steps when developing a new lint rule.
It helps us ensure that our lint rules do what they are intended to do.

We use `jest` for testing, and since most of the code is based on pure functions, there is little mocking to do.
This makes `@sasjs/lint` very easy to unit test, and so there is no excuse for not testing a new rule. :)

When adding a new rule, please make sure that all positive and negative scenarios are tested in separate test cases.
When modifying an existing rule, ensure that your changes haven't affected existing functionality by running the tests on your machine.

You can run the tests using `npm test`.

## Code Style

This repository uses `Prettier` to ensure a uniform code style.
If you are using VS Code for development, you can automatically fix your code to match the style as follows:

- Install the `Prettier` extension for VS Code.
- Open your `settings.json` file by choosing 'Preferences: Open Settings (JSON)' from the command palette.
- Add the following items to the JSON.
  ```
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true,
  ```

If you are using another editor, or are unable to install the extension, you can run `npm run lint:fix` to fix the formatting after you've made your changes.
