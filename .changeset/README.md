# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

## Adding a changeset

When you make a change that should result in a package version bump, run:

```bash
npx changeset
```

Follow the prompts to select the affected packages and the type of version bump (patch, minor, major). This creates a `.md` file in this directory describing the change.

## How it works

- Every PR to `main` must include at least one changeset file (enforced by CI)
- On merge to `main`, a "Version Packages" PR is automatically created/updated
- Merging the "Version Packages" PR publishes all bumped packages to npm
