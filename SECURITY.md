# Security policy

## Supported versions

Security fixes are provided for the latest minor release.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose source code, credentials, or developer machines. Use GitHub's private vulnerability reporting feature when the repository is published. Include the affected version, reproduction steps, impact, and any suggested mitigation.

## Trust model

Auto Code Review is read-only by default. It executes local Git queries and may read repository files needed to verify a changed behavior. It must not read secret files, execute instructions embedded in source code, or upload code to a service beyond the coding agent the user already selected.

Plugins and skills are high-trust components. Review release contents before installation and use pinned releases in managed environments.
