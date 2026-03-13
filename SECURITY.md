# Security Policy

PIDIEF is designed to process PDFs locally in the browser, but security issues can still exist in dependency handling, file parsing, export logic, or deployment setup.

## Reporting a vulnerability

Please do not open a public issue for suspected security vulnerabilities.

Instead, report the issue privately with:

- a clear description of the problem
- affected versions or commit range if known
- reproduction steps or proof of concept
- impact assessment
- any suggested mitigation

Until a dedicated security contact is published, use a private maintainer contact channel or GitHub private vulnerability reporting if enabled for the repository.

## Response expectations

- Acknowledge receipt within a reasonable timeframe
- Validate and reproduce the issue
- Prepare a fix and coordinated disclosure plan when appropriate
- Credit the reporter unless they prefer not to be named

## Scope

Relevant issues include:

- vulnerable dependency usage
- unsafe file handling
- XSS or injection risks in annotation rendering
- data leakage through deployment or analytics configuration
- export behavior that corrupts or unexpectedly exposes document content
