# Release procedure (npm)

This repository publishes to npm via GitHub Actions when a semver tag like `v0.1.1` is pushed.

## One-time setup

1. Create an npm automation token (npmjs.com → Profile → Access Tokens → Generate New Token → Automation).
2. Add it to GitHub Actions secrets as `NPM_TOKEN`.

## Publish a new release

1. Update `package.json` with the new version (e.g., `0.1.1`).
2. Commit the version bump.
3. Create a Git tag matching the version, prefixed with `v` (e.g., `v0.1.1`).
4. Push the tag to GitHub.
5. Verify the workflow run in GitHub Actions completed successfully.

## Notes

- The publish workflow runs `npm publish --access public`. Scoped packages are private by default on first publish, so this flag is required for public releases.
- `npm publish` triggers the `prepublishOnly` script, which runs typecheck, lint, tests, and build.
