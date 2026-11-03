# Security Policy

Security is an extremely high priority when it comes to the SASjs product suite. We take a number of steps across all repositories to minimise risk, such as:

- Regular dependency updates - Dependabot, for the GitHub Actions this repository runs
- A weekly dependency audit that files an issue when an advisory appears, or when one of the reviewed exemptions next to the gate stops applying
- Keeping the production dependency surface small
- Mutation testing, so a passing test has to be a test that can fail

## Supported Versions

We support only the latest version

## Reporting a Vulnerability

We welcome disclosures of all kinds in relation to all the SASjs libraries. You can submit them here: [https://sasapps.io/contact-us](https://sasapps.io/contact-us)
