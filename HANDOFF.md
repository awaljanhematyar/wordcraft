# WordCraft handoff

Prepared 2026-10-23. Source is editable and buildless. Publication is not approved by this preparation task.

## Delivery contents

The ZIP contains wordcraft/ with the application, licensed dictionary notices, tests and QA records, screenshots, architecture, deployment instructions, portfolio copy and reports. An optional wordcraft-history.bundle at archive root preserves the local main-branch snapshot. It contains no external remote or credentials. Plain source users can initialize Git themselves. No .git directory, environment files, caches or node_modules are included in the ZIP.

Start with README.md, then PHASE_6_REPORT.md. Serve wordcraft/ over static HTTP. No install/build step is required. Run `node --test` with Node 20+ for automated tests. Node is not part of production hosting.

## Maintenance

- Keep pure rules separate from DOM/browser coordination. Reuse the controller and shared submission path.
- Treat Local Storage as untrusted. Preserve schema validation/replay and completion deduplication.
- Preserve daily-v1 mappings and scheduled-word membership. A changed schedule requires a documented migration/version.
- Keep dictionary license/provenance/checksums with redistributed word data. Original source licensing is separate.
- Re-run the test suite after changes and record only executed browser checks. Browser fixtures belong under tests and are excluded from deployment.
- Update version and migration documentation deliberately. package.json remains private because no npm package publication is intended.

## Local Git snapshot

A local main branch is prepared without any external remote. Its initial technical author is WordCraft Handoff <handoff@localhost>, a non-contact local placeholder, not the owner's personal email. Configure your real Git identity before future commits. To restore the optional snapshot, run `git clone wordcraft-history.bundle wordcraft-git` from the archive directory. This creates only a local checkout. Review/remove the bundle-path origin before adding an approved remote. The plain source folder remains usable without Git.

## Ownership and publication gates

Original code/assets/docs retain all-rights-reserved status until the owner selects an open-source license or a client agreement defines reuse/ownership. This handoff does not assign copyright. The Wordnik data retains its MIT terms.

Before publication, approve the repository/audience, hosting origin, source license or client terms, final canonical/social metadata and any portfolio changes. Then follow DEPLOYMENT.md. This task creates no remote GitHub repository, Vercel deployment or personal-portfolio edit.
