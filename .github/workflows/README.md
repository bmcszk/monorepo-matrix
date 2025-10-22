# GitHub Actions

## `ci.yml` - CI Pipeline

- **Triggers**: Push to any branch, Pull Requests
- **Runs**: `make install → make test → make build → make lint`
- **Auto-commits**: Changes to `dist/index.js` with `[skip ci]`