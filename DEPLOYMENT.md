# Deployment readiness and approval gate

Status: prepared, not published. No remote repository or Vercel project has been created. Do not execute publication commands until the owner explicitly approves.

## Configuration reviewed

vercel.json selects `framework: null` (Other), `installCommand: ""`, `buildCommand: ""` and `outputDirectory: "."`. This serves the root static files without a frontend build or production Node process. There are no functions or SPA rewrites. Keep JavaScript under js/ so it is served as static modules.

Official references checked on 2026-10-23:

- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/project-configuration/vercel-json

The deployment root must contain index.html and vercel.json. If the repository contains a wrapper wordcraft directory, select that directory as the Vercel Root Directory. Prefer placing its contents directly at repository root. `.vercelignore` excludes tests, screenshots, internal reports, local metadata, caches and environment files. Keep assets/WORDNIK_LICENSE.txt and the original source notice.

## Before approved publication

1. Review the final source license or client ownership agreement. LICENSE.md currently grants no open-source rights. Dictionary rights remain MIT regardless of the source-code decision.
2. Approve the GitHub repository name, audience and publication. Proposed name: wordcraft. Suggested description: Buildless JavaScript word puzzle with UTC daily challenges, unlimited practice, strict Hard Mode and persistent statistics.
3. Approve the final hosting origin. Add its absolute canonical and og:url URLs, and create/approve a social preview image with an absolute og:image URL. Current title, description, language, viewport and basic Open Graph metadata are present. No placeholder production domain is shipped.
4. Preserve the daily-v1 schedule snapshot and dictionary checksums. Never regenerate v1 answers as part of deployment.

## GitHub steps after approval only

The local repository has a main branch and no external remote. The optional wordcraft-history.bundle in the delivery archive preserves its local snapshot. Source ZIP files themselves omit .git and credentials.

If using the plain source ZIP, initialize with `git init -b main`, review `git status`, configure your own author identity, then add and commit the reviewed files. If using the bundle, clone it into a new folder and configure your identity for future commits. Review the snapshot before adding the approved remote. Only then create the approved GitHub repository, add its URL as origin and push main. No credentials belong in URLs, files, shell history or documentation.

Suggested repository topics: javascript, html5, css3, word-game, daily-puzzle, localstorage, accessibility, node-test-runner. README, LICENSE.md, THIRD_PARTY_NOTICES.md, architecture, tests and provenance are included. This handoff does not create issues, send messages or publish the portfolio case study.

## Vercel steps after approval only

Import the approved repository. Select Other, choose the correct Root Directory, leave install/build commands empty and use output directory `.`. No environment variables or backend are required. Inspect the deployment file list to confirm QA fixtures and internal reports are excluded and the dictionary license is included. Publish only with explicit approval.

## Live checks after deployment

These checks are pending and must not be described as passed before execution:

- HTTPS certificate, canonical/social URLs and final metadata.
- 200 responses for /, /css/style.css and every imported /js/*.js module.
- JavaScript MIME type text/javascript or application/javascript, HTML text/html, CSS text/css. Native modules must execute without MIME/CSP errors.
- Actual headers: X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options DENY, configured CSP and Permissions-Policy.
- CSP allows only same-origin assets/scripts/connections. It blocks object embedding, foreign framing and form actions. No unsafe-inline/eval exception is configured. Dynamic application CSS property updates and optional audio must be checked under the actual headers.
- Daily identity/UTC rollover, unlimited creation, duplicate scoring/Hard Mode, reload persistence, settings, statistics and manual-copy fallback.
- Successful Clipboard API copying from a user gesture if permission is granted. Verify no answer/guess text appears in copied content.
- Mobile widths, keyboard dialogs/focus, no console errors and correct not-found behavior for unknown asset URLs. Do not add a catch-all rewrite that returns HTML for missing JS files.
- Browser matrix for engines/devices available at that time. Record exact evidence, failures and unverified checks.

The local preview returned correct HTTP content types and ran native modules, but it is not HTTPS and does not apply Vercel's configured headers. Local evidence is in tests/PHASE_6_HTTP.json. There is no live deployment claim in this handoff.
