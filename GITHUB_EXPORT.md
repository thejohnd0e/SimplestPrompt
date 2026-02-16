# GitHub Export Checklist

Use this checklist to publish the extension into a new GitHub repository.

## 1. Initialize repository

```bash
git init
git add .
git commit -m "Initial release v1.05"
```

## 2. Create a new GitHub repository

- Create an empty repository on GitHub (without auto-generated README/license files).
- Copy its remote URL.

## 3. Connect local repo and push

```bash
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 4. Create first release tag (optional)

```bash
git tag -a v1.05 -m "Release v1.05"
git push origin v1.05
```

## 5. Verify repository contents

- `README.md` renders correctly
- `manifest.json` has version `1.0.5` and `version_name` `1.05`
- Icons are present in `icons/`
- No local-only junk files are committed (`.gitignore` handles this)

## 6. Optional files before public launch

- Add `LICENSE` (MIT recommended)
- Add screenshots/GIF to repository for documentation
- Add GitHub topics: `chrome-extension`, `productivity`, `prompt-tooling`
