# Developer Onboarding Checklist 🚀

Welcome to **Zoolandingpage**! This checklist will help you get up and running quickly with our Docker-first development environment.

## 🎯 Quick Start (5 minutes)

### Prerequisites Checklist

- [ ] **Docker** installed and running ([Download Docker](https://www.docker.com/get-started))
- [ ] **Docker Compose** available (included with Docker Desktop)
- [ ] **Git** configured with your credentials
- [ ] **Modern browser** for testing (Chrome, Firefox, Safari, Edge)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/LynxPardelle/zoolandingpage.git
cd zoolandingpage

# 🚀 Complete setup and start development (one command!)
make quick-start
```

That's it! Your development environment is now running at:

- **Development Server**: <http://localhost:6161>
- **Hot-reload**: Enabled automatically
- **Docker**: Everything containerized

## 📚 Understanding the Project

### Project Architecture

```text
zoolandingpage/
├── 🐳 Docker-first development (zero Node.js installation needed)
├── 🅰️ Angular 20+ with latest features (@if, @for, @defer)
├── 🎨 NGX-Angora-CSS for dynamic theming
├── 🌐 SSR support for production
├── 📱 Mobile-first responsive design
├── 🔧 Make commands for everything
└── ⚡ Zero-configuration setup
```

### Core Technologies

- **Frontend**: Angular 20+ (Standalone Components, Signals, New Control Flow)
- **Styling**: NGX-Angora-CSS (Dynamic CSS generation)
- **Build**: Webpack + Angular CLI
- **Testing**: Jest + Cypress
- **Container**: Docker + Docker Compose
- **Automation**: Make commands
- **Languages**: TypeScript (strict mode), SCSS

## 🔧 Developer Experience Features

### Make Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `make quick-start` | Complete setup | First time setup |
| `make dev` | Development server | Daily development |
| `make dev-logs` | View logs | Debugging |
| `make test` | Run tests | Before commits |
| `make code-quality` | Quality checks | Before PRs |
| `make clean` | Reset environment | When stuck |

### Development Workflow

```bash
# 1. Start your day
make dev              # Starts development server

# 2. View logs (separate terminal)
make dev-logs         # Real-time log monitoring

# 3. Run tests
make test             # Unit tests
make code-quality     # All quality checks

# 4. End of day
make stop             # Stop containers
```

### Container Shell Access

```bash
# Access container shell for debugging
make dev-shell

# Inside container, you can run:
npm install some-package
ng generate component new-component
npm run custom-script
```

## 🎨 Development Standards

### Critical Requirements (MANDATORY)

1. **Type System**: Use `type` only (NO interfaces/enums)

   ```typescript
   // ✅ Correct
   type UserRole = 'admin' | 'user';
   
   // ❌ Forbidden
   interface UserRole { }
   enum UserRole { }
   ```

2. **Theming**: Use ngx-angora-css `pushColor` method

   ```typescript
   ngAfterRender(): void {
     this._ank.pushColor('component-bg', '#ffffff');
     this._ank.cssCreate();
   }
   ```

3. **File Size**: Keep files under 80 lines (atomic principle)

4. **Angular Features**: Use Angular 17-20 features exclusively

   ```typescript
   // ✅ New control flow
   @if (condition) { <div>Content</div> }
   @for (item of items(); track item.id) { <div>{{ item.name }}</div> }
   
   // ❌ Old syntax
   *ngIf, *ngFor // Not allowed
   ```

### Code Quality Gates

- ✅ **Linting**: ESLint with strict rules
- ✅ **Testing**: 90%+ coverage required
- ✅ **Type Safety**: Strict TypeScript mode
- ✅ **Performance**: Bundle size monitoring
- ✅ **Accessibility**: WCAG 2.1 AA compliance

## 🧪 Testing Strategy

### Running Tests

```bash
# Unit tests
make test

# All quality checks
make code-quality

# Individual test types
make security-scan
make performance-test
make accessibility-test

# Complete test suite
make full-test-suite
```

### Test Structure

```text
src/
├── app/
│   ├── component.component.spec.ts    # Unit tests
│   └── component.component.cy.ts      # Component tests
├── testing/
│   ├── utils/                         # Test utilities
│   └── mocks/                         # Mock data
└── e2e/
    └── integration/                   # E2E tests
```

## 📖 Documentation

### Must-Read Documents

1. **[Requirements Summary](REQUIREMENTS_SUMMARY.md)** - 🚨 MANDATORY requirements
2. **[Development Guide](03-development-guide.md)** - Coding standards
3. **[NGX-Angora-CSS Guide](04-ngx-angora-css.md)** - Styling system
4. **[Architecture Overview](02-architecture.md)** - Technical architecture

### Documentation Server

```bash
# Serve documentation locally
make docs-serve
# Visit: http://localhost:8000
```

## 🛠 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port already in use | `make stop` then `make clean` |
| Docker build fails | `make rebuild` |
| Container won't start | Check Docker is running |
| Dependencies out of sync | `make clean && make dev-setup` |
| Tests failing | `make full-test-suite` to identify issues |

### Debug Commands

```bash
# Container status
make status

# Container health
make health

# Debug build issues
make debug

# View all logs
make logs
```

### Getting Help

1. **Check documentation**: `make docs-serve`
2. **View logs**: `make dev-logs`
3. **Reset environment**: `make clean && make quick-start`
4. **Container access**: `make dev-shell`

## 🚀 Production Deployment

### Production Commands

```bash
# Production with SSR
make prod

# Static production (Nginx)
make prod-no-ssr

# Complete deployment workflow
make production-deploy
```

### Environment Configuration

```bash
# Copy environment template
cp .example.env .env

# Edit configuration
# - Set APP_NAME
# - Configure ports
# - Set feature flags
```

## 🎯 Next Steps

### After Setup

1. **Explore the codebase**
   - Start with `src/app/app.component.ts`
   - Review component structure in `src/app/shared/components/`
   - Check out the planning documents in `plan/`

2. **Run the component showcase**

   ```bash
   make dev
   # Visit: http://localhost:6161
   ```

3. **Set up your IDE**
   - Install Angular Language Service
   - Configure ESLint and Prettier
   - Set up debugging configuration

4. **Join the development workflow**
   - Read the [Contributing Guidelines](../README.md#contributing)
   - Review open issues and project roadmap
   - Start with good first issues

### Development Environment Tips

- **Hot Reload**: Files automatically reload on save
- **Port Mapping**: Container port 4200 → Host port 6161
- **Volume Mounting**: Source code syncs automatically
- **Node Modules**: Optimized with volume mounting
- **Build Cache**: Angular build cache persisted

## ✅ Onboarding Completion Checklist

Before you start developing, ensure:

- [ ] `make quick-start` completed successfully
- [ ] Development server accessible at <http://localhost:6161>
- [ ] `make test` passes all tests
- [ ] `make code-quality` passes all checks
- [ ] Documentation accessible via `make docs-serve`
- [ ] Read **[REQUIREMENTS_SUMMARY.md](REQUIREMENTS_SUMMARY.md)** (MANDATORY)
- [ ] Understand Docker-first workflow
- [ ] IDE configured with Angular Language Service

## 🎉 Welcome to the Team

You're now ready to contribute to **Zoolandingpage**! 

- **Need help?** Check the documentation or ask questions
- **Ready to code?** Review the project roadmap and pick a task
- **Want to contribute?** Follow our contribution guidelines

Happy coding! 🚀

---

**Quick Reference:**

- Start development: `make dev`
- Run tests: `make test`
- Quality checks: `make code-quality`
- Stop everything: `make stop`
- Reset: `make clean && make quick-start`
