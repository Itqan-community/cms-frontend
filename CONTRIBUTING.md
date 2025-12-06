# Contributing to CMS Frontend

Thank you for your interest in contributing to the CMS Frontend project! We welcome contributions
from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Automated Quality Checks

This project uses automated tools to maintain code quality and consistency:

| Check               | When       | Tool           | What It Does                         |
| ------------------- | ---------- | -------------- | ------------------------------------ |
| **Code Formatting** | Pre-commit | Prettier       | Automatically formats your code      |
| **Commit Messages** | On commit  | commitlint     | Enforces Conventional Commits format |
| **Branch Names**    | Pre-push   | Custom script  | Validates branch naming convention   |
| **Tests & Build**   | CI/CD      | GitHub Actions | Runs tests and builds on PR          |

### What This Means for You

✅ **Benefits:**

- Your code is automatically formatted - no style debates!
- Catch errors before committing
- Clean, searchable commit history
- Organized branch structure

⚠️ **What to Expect:**

- Commits will be rejected if messages don't follow the format
- Pushes will be rejected if branch names are invalid
- Pre-commit hooks may take 3-10 seconds to run
- You can bypass hooks with `--no-verify` in emergencies (not recommended)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/cms-frontend.git`
3. Add the upstream repository:
   `git remote add upstream https://github.com/Itqan-community/cms-frontend.git`

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Git

### Installation

```bash
# Install dependencies (this will also set up git hooks automatically)
npm install

# Start development server
npm start

# The application will be available at http://localhost:4200
```

**Note:** The `npm install` command automatically runs `husky install` to set up git hooks. These
hooks will help you maintain code quality.

### Environment Configuration

The project uses multiple environments:

- `environment.ts` - Default development environment
- `environment.develop.ts` - Development deployment (develop branch)
- `environment.staging.ts` - Staging deployment (staging branch)
- `environment.prod.ts` - Production deployment (master branch)

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in
  [Issues](https://github.com/Itqan-community/cms-frontend/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable
  - Environment details (browser, OS, Node version)

### Suggesting Features

- Check existing issues and discussions
- Create a new issue with the "enhancement" label
- Provide detailed description and use cases
- Be open to discussion and feedback

### Code Contributions

1. **Create a branch** from `develop`:

   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, maintainable code
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

3. **Test your changes**:

   ```bash
   npm run test
   npm run build
   ```

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** from your fork to the `develop` branch

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the README.md or documentation if needed
3. Make sure all tests pass
4. Ensure your branch is up to date with the base branch
5. Fill out the pull request template completely
6. Link any related issues
7. Request review from maintainers
8. Address any feedback or requested changes

### PR Title Format

Follow conventional commits format:

- `feat: add new feature`
- `fix: resolve bug in component`
- `docs: update README`
- `style: format code`
- `refactor: restructure component`
- `test: add unit tests`
- `chore: update dependencies`

## Coding Standards

### Angular Style Guide

Follow the [Angular Style Guide](https://angular.dev/style-guide) for all Angular-specific code.

### TypeScript

- Use TypeScript strict mode
- Define proper types and interfaces
- Avoid using `any` type
- Use meaningful variable and function names

### Component Structure

```typescript
// Component naming: feature-name.component.ts
// Page naming: page-name.page.ts
// Service naming: service-name.service.ts

@Component({
  selector: 'app-component-name',
  templateUrl: './component-name.component.html',
  styleUrls: ['./component-name.component.less'],
})
export class ComponentNameComponent implements OnInit {
  // Properties
  // Constructor
  // Lifecycle hooks
  // Public methods
  // Private methods
}
```

### File Organization

- Follow the existing folder structure
- Group related files together
- Use index files for barrel exports when appropriate

### Styling

- Use LESS for styling
- Follow BEM naming convention for CSS classes
- Keep styles component-scoped
- Use theme variables for colors and spacing

### Code Formatting

- Use Prettier for code formatting
- Run `npm run format` before committing
- Pre-commit hooks will automatically format your code

## Branch Naming Convention

**This is automatically enforced by git hooks.**

Branch names must follow this pattern: `type/description-in-kebab-case`

### Allowed Types

- `feature/` - New features (e.g., `feature/quranic-search`)
- `fix/` - Bug fixes (e.g., `fix/api-timeout-issue`)
- `docs/` - Documentation changes (e.g., `docs/update-readme`)
- `style/` - Code style changes (e.g., `style/format-components`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `perf/` - Performance improvements (e.g., `perf/optimize-queries`)
- `test/` - Adding or updating tests (e.g., `test/add-auth-tests`)
- `build/` - Build system changes (e.g., `build/update-dependencies`)
- `ci/` - CI/CD changes (e.g., `ci/add-deployment-step`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)
- `revert/` - Reverting changes (e.g., `revert/remove-feature`)

### Protected Branches

These branches are always allowed: `master`, `develop`, `staging`

### Examples

✅ **Good:**

```bash
feature/add-surah-details
fix/resolve-translation-bug
docs/update-api-documentation
```

❌ **Bad:**

```bash
my-branch
fix_bug
AddSurahDetails
test123
```

## Commit Message Guidelines

**This is automatically enforced by commitlint.**

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Format Rules

- **type**: Must be one of the allowed types (see below)
- **scope**: Optional, use kebab-case (e.g., `auth`, `api`, `gallery`)
- **subject**: Brief description, no period at the end, max 100 characters
- **body**: Optional, detailed explanation
- **footer**: Optional, reference issues (e.g., `Closes #123`, `Fixes #456`)

### Allowed Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system changes
- `ci` - CI/CD configuration changes
- `chore` - Maintenance tasks
- `revert` - Reverting previous commits

### Examples

✅ **Good:**

```
feat(auth): add login functionality

- Implement login form component
- Add authentication service
- Create auth guard for protected routes

Closes #123
```

```
fix(gallery): resolve image loading issue

Images were not loading properly due to incorrect path resolution.
Updated the asset service to handle relative paths correctly.

Fixes #456
```

```
docs(readme): update installation instructions
```

```
refactor(api): improve error handling in asset service
```

❌ **Bad:**

```
updated stuff
fix bug
Added new feature
WIP
```

### Bypassing Hooks (Not Recommended)

If you absolutely need to bypass the commit hooks (e.g., emergency hotfix):

```bash
git commit --no-verify -m "your message"
```

**Note:** This should only be used in exceptional circumstances.

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run e2e
```

## Questions or Need Help?

- Open a discussion in
  [GitHub Discussions](https://github.com/Itqan-community/cms-frontend/discussions)
- Visit our [Community Forum](https://community.itqan.dev)
- Connect with us on [LinkedIn](https://www.linkedin.com/company/itqan-community/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in our README.md and release notes.

Thank you for contributing to CMS Frontend! 🎉
