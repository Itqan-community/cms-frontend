# Itqan CMS Frontend

> An open-source Quranic Content Management System frontend built with Angular 20. Itqan CMS
> empowers developers and publishers by providing a comprehensive platform to access, manage, and
> distribute Quranic assets with proper licensing. Built for the global Islamic tech community to
> create innovative Quranic applications and services.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-20.3-red.svg)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/8eb96aae-c93e-478d-8f56-f4172392251c/deploy-status)](https://app.netlify.com/projects/itqan-cms/deploys)

## 🌟 Features

- **Quranic Asset Management** - Browse, search, and manage Quranic content including recitations,
  translations, tafsir, and more
- **Publisher Portal** - Empowers publishers to safely publish and manage their Quranic content with
  proper licensing
- **Developer-Friendly API** - Provides structured access to Quranic assets for building apps and
  services
- **Content Standards** - Comprehensive guidelines ensuring quality and authenticity of Quranic
  content
- **License Management** - Track, manage, and enforce content licenses to protect intellectual
  property
- **Internationalization** - Multi-language support (English & Arabic) with RTL support
- **Authentication & Authorization** - Secure user management with role-based access control
- **Responsive Design** - Modern, accessible UI built with Ng-Zorro (Ant Design for Angular)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **npm** 9 or higher (comes with Node.js)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/Itqan-community/cms-frontend.git

# Navigate to the project directory
cd cms-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:4200/`

## 📦 Tech Stack

- **Framework**: [Angular 20](https://angular.dev)
- **UI Library**: [Ng-Zorro (Ant Design)](https://ng.ant.design/)
- **Styling**: LESS
- **Internationalization**: [@ngx-translate](https://github.com/ngx-translate/core)
- **Build Tool**: Angular CLI
- **Testing**: Karma + Jasmine

## 🛠️ Development

### Available Scripts

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `npm start`                | Start development server on `http://localhost:4200` |
| `npm run build`            | Build for production                                |
| `npm run build:develop`    | Build for development environment                   |
| `npm run build:staging`    | Build for staging environment                       |
| `npm run build:production` | Build for production environment                    |
| `npm run test`             | Run unit tests with Karma                           |
| `npm run lint`             | Lint the codebase                                   |
| `npm run format`           | Format code with Prettier                           |
| `npm run format:check`     | Check code formatting without modifying files       |

### Project Structure

```
cms-frontend/
├── public/                   # Static assets
│   ├── assets/              # Images, icons, fonts
│   └── i18n/                # Translation files
├── src/
│   ├── app/
│   │   ├── core/            # Core functionality (auth, constants, enums)
│   │   ├── features/        # Feature modules (gallery, publishers, etc.)
│   │   └── shared/          # Shared components and services
│   ├── environments/        # Environment configurations
│   └── styles/              # Global styles
├── angular.json             # Angular CLI configuration
├── netlify.toml            # Netlify deployment configuration
└── package.json            # Dependencies and scripts
```

### Angular Configuration

The project uses Angular 20 with:

- **Build System**: Application builder (`@angular/build:application`)
- **Style Preprocessor**: LESS
- **Routing**: Standalone components with Angular Router
- **State Management**: RxJS + Angular Signals
- **HTTP Client**: Angular HttpClient with interceptors

### Code Generation

```bash
# Generate a new component
ng generate component component-name

# Generate a new service
ng generate service service-name

# Generate a new module
ng generate module module-name

# For more options
ng generate --help
```

## 🌍 Environments

The application supports three deployment environments:

| Environment     | Branch    | URL                           | Config File              |
| --------------- | --------- | ----------------------------- | ------------------------ |
| **Development** | `develop` | https://develop.cms.itqan.dev | `environment.develop.ts` |
| **Staging**     | `staging` | https://staging.cms.itqan.dev | `environment.staging.ts` |
| **Production**  | `master`  | https://cms.itqan.dev         | `environment.prod.ts`    |

### Building for Different Environments

```bash
# Development build
npm run build -- --configuration=development

# Staging build
npm run build -- --configuration=staging

# Production build
npm run build -- --configuration=production
```

## 🚢 Deployment

The project is configured for automatic deployment on Netlify:

- **Develop Branch** → Development environment
- **Staging Branch** → Staging environment
- **Master Branch** → Production environment

Deployment is handled automatically via `netlify.toml` configuration.

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy the dist/cms-frontend/browser directory to your hosting provider
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in headless mode (CI)
npm run test -- --browsers=ChromeHeadless --watch=false

# Run tests with code coverage
npm run test -- --code-coverage
```

## 🎨 Code Style

This project uses:

- **Prettier** for code formatting
- **EditorConfig** for consistent editor settings
- **ESLint** for linting (if configured)

### Format Code

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Automated Quality Checks

This project uses Git hooks to maintain code quality:

- **Pre-commit**: Auto-formats code with Prettier
- **Commit-msg**: Validates commit messages follow Conventional Commits
- **Pre-push**: Validates branch naming convention

These hooks are automatically installed when you run `npm install`.

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md)
to get started.

### Development Workflow

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes
4. Write/update tests as needed
5. Ensure all tests pass
6. Submit a Pull Request to `develop` branch

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Backend Repository**: [cms-backend](https://github.com/Itqan-community/cms-backend)
- **Production Site**: [https://cms.itqan.dev](https://cms.itqan.dev)
- **Community Forum**: [community.itqan.dev](https://community.itqan.dev)
- **Documentation**: [Angular Docs](https://angular.dev) | [Ng-Zorro Docs](https://ng.ant.design/)
- **Issues**: [Report a Bug](https://github.com/Itqan-community/cms-frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Itqan-community/cms-frontend/discussions)

## 👥 Contributors

Thanks to all our contributors! See the
[Contributors](https://github.com/Itqan-community/cms-frontend/graphs/contributors) page.

## 🤝 Community

- **Website**: [https://itqan.dev](https://itqan.dev)
- **Community Forum**: [community.itqan.dev](https://community.itqan.dev)
- **LinkedIn**: [Itqan Community](https://www.linkedin.com/company/itqan-community/)
- **GitHub**: [Itqan Community](https://github.com/Itqan-community)

---

Made with ❤️ by the Itqan Community
