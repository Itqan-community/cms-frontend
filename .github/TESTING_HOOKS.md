# Testing Git Hooks

This document provides instructions for testing the automated git hooks.

## Prerequisites

Make sure you've installed dependencies:

```bash
npm install
```

This should automatically set up the git hooks via Husky.

## Verify Hooks Are Installed

Check that the `.husky/` directory contains these files:

```bash
ls -la .husky/
# Should show: pre-commit, commit-msg, pre-push
```

## Test 1: Pre-commit Hook (Code Formatting & Linting)

This hook runs Prettier and ESLint on staged files.

### Test Case: Valid Code

1. Make a change to any TypeScript file
2. Stage the file: `git add <file>`
3. Try to commit: `git commit -m "test: verify pre-commit hook"`
4. **Expected:** Code is automatically formatted and commit succeeds

### Test Case: Code with Issues

1. Add some badly formatted code to a TypeScript file
2. Stage and commit
3. **Expected:** Code is auto-formatted before commit

## Test 2: Commit Message Hook (commitlint)

This hook validates commit messages follow Conventional Commits.

### Test Case: Valid Commit Message

```bash
git commit --allow-empty -m "feat(auth): add login functionality"
```

**Expected:** ✅ Commit succeeds

```bash
git commit --allow-empty -m "fix: resolve api timeout issue"
```

**Expected:** ✅ Commit succeeds

```bash
git commit --allow-empty -m "docs(readme): update installation steps"
```

**Expected:** ✅ Commit succeeds

### Test Case: Invalid Commit Messages

```bash
git commit --allow-empty -m "updated stuff"
```

**Expected:** ❌ Commit fails with validation error

```bash
git commit --allow-empty -m "FIX: something"
```

**Expected:** ❌ Commit fails (type must be lowercase)

```bash
git commit --allow-empty -m "fix bug"
```

**Expected:** ❌ Commit fails (missing colon separator)

```bash
git commit --allow-empty -m "feat(Auth): add feature"
```

**Expected:** ❌ Commit fails (scope must be lowercase)

## Test 3: Pre-push Hook (Branch Naming)

This hook validates branch names follow the convention.

### Setup Test Branch

First, make some commits to test with (if you haven't already).

### Test Case: Valid Branch Names

```bash
# Create valid branches
git checkout -b feature/test-quranic-search
git push origin feature/test-quranic-search
```

**Expected:** ✅ Push succeeds

```bash
git checkout -b fix/test-api-bug
git push origin fix/test-api-bug
```

**Expected:** ✅ Push succeeds

```bash
git checkout -b docs/test-update-readme
git push origin docs/test-update-readme
```

**Expected:** ✅ Push succeeds

### Test Case: Invalid Branch Names

```bash
git checkout -b my-test-branch
git push origin my-test-branch
```

**Expected:** ❌ Push fails with branch naming error

```bash
git checkout -b Feature/Test
git push origin Feature/Test
```

**Expected:** ❌ Push fails (must be lowercase)

```bash
git checkout -b fix_bug
git push origin fix_bug
```

**Expected:** ❌ Push fails (must use kebab-case with slash)

### Test Case: Protected Branches (Always Allowed)

```bash
git checkout develop
git push origin develop
```

**Expected:** ✅ Push succeeds (protected branch)

## Test 4: Complete Workflow

Try a full workflow from start to finish:

```bash
# 1. Create a valid branch
git checkout develop
git checkout -b feature/test-complete-workflow

# 2. Make a change
echo "// Test comment" >> src/main.ts

# 3. Stage the file
git add src/main.ts

# 4. Try to commit with valid message
git commit -m "feat(core): add test comment"
# Expected: ✅ Pre-commit runs, formats code, commit succeeds

# 5. Push the branch
git push origin feature/test-complete-workflow
# Expected: ✅ Pre-push validates branch name, push succeeds
```

## Bypassing Hooks (Emergency Only)

If you need to bypass hooks in an emergency:

```bash
# Skip all hooks
git commit --no-verify -m "emergency fix"
git push --no-verify
```

**⚠️ Warning:** Only use this in true emergencies. It bypasses all quality checks.

## Troubleshooting

### Issue: Hooks Not Running

**Solution 1:** Reinstall Husky

```bash
npm run prepare
```

**Solution 2:** Check hook permissions

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push
```

**Solution 3:** Verify Husky is installed

```bash
ls -la .git/hooks/
# Should see symlinks to .husky hooks
```

### Issue: "ng lint" Command Fails

If you don't have ESLint configured yet, you can temporarily remove it from lint-staged:

Edit `package.json`:

```json
"lint-staged": {
  "*.{ts,js}": [
    "prettier --write"
  ],
  ...
}
```

### Issue: Pre-push Hook Fails on Protected Branch

This is expected! You shouldn't be pushing directly to `develop`, `staging`, or `master`.

Create a feature branch instead:

```bash
git checkout -b feature/your-feature-name
```

## Clean Up Test Branches

After testing, clean up:

```bash
# Delete local branches
git branch -D feature/test-quranic-search fix/test-api-bug docs/test-update-readme

# Delete remote branches
git push origin --delete feature/test-quranic-search
git push origin --delete fix/test-api-bug
git push origin --delete docs/test-update-readme
```

## Success Criteria

All hooks are working correctly if:

- ✅ Pre-commit auto-formats your code
- ✅ Invalid commit messages are rejected
- ✅ Invalid branch names prevent pushing
- ✅ Valid commits and pushes work smoothly

## Need Help?

If hooks aren't working as expected, open an issue on GitHub with:

- The command you ran
- The error message
- Output of `git --version` and `node --version`
