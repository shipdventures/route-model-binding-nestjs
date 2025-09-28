# GitHub Actions Workflows

## CI Workflow (`ci.yml`)

Runs automatically to ensure code quality and handle releases:

### Triggers
- Every push to `main` branch
- Every pull request to `main` branch  
- Every version tag push (e.g., `v0.1.0`)

### What it does
1. **On every push/PR**: Runs linting, builds, and tests
2. **On version tags**: Also publishes to npm after tests pass

## Setup Required

### NPM Token
1. Go to npmjs.com and sign in
2. Generate an access token (Automation token recommended)
3. In GitHub repo settings: Settings → Secrets → Actions
4. Add a secret named `NPM_TOKEN` with the token value

## How to Release

### First Release
```bash
# Make sure everything is committed
git add .
git commit -m "feat: initial release"
git push origin main

# Create and push the version tag
git tag v0.1.0
git push origin v0.1.0
```

### Subsequent Releases
```bash
# Update version in both package.json files
npm version patch  # or minor, major
cd libs/route-model-binding
npm version patch  # same version as above
cd ../..

# Commit the version bump
git add -A
git commit -m "chore: bump version to 0.1.1"
git push origin main

# Create and push the tag
git tag v0.1.1
git push origin v0.1.1
```

The CI workflow will automatically detect the new tag and publish to npm.