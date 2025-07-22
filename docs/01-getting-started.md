# Getting Started 🚀

This guide will help you set up and run the Zoolandingpage project using either Docker (recommended) or local development.

## ✅ Requirements

- **Docker** (20.10+) - Primary development environment
- **Make** - Available by default in Unix/Linux/macOS; for Windows use WSL, Git Bash, or chocolatey
- **Git** - Version control
- **Node.js 18+** and **npm** (optional, for local development)
- **Angular CLI 20+** (optional, for local development)

## 🐳 Docker Development (Recommended)

This project supports **zero local dependencies** development using Docker:

### 1. Create and setup the project

```bash
# Clone the repository
git clone https://github.com/LynxPardelle/zoolandingpage.git
cd zoolandingpage

# Start development with Docker (zero local dependencies)
make dev
```

Your app will be available at: [http://localhost:6161](http://localhost:6161)

### 2. Development Commands

```bash
# Primary development workflow
make dev                    # Start development server with hot-reload
make dev-detached          # Start development server in background
make dev-logs              # Show development container logs
make dev-shell             # Access development container shell

# Production testing
make prod                  # Start production server with SSR
make prod-no-ssr           # Start production server without SSR (Nginx)

# Package management in containers
make install pkg=ngx-angora-css           # Install runtime package
make install-dev pkg=@types/node          # Install dev dependency
make update                               # Update all packages
```

### 3. Container Management

```bash
make stop                  # Stop all running containers
make restart               # Restart containers
make clean                 # Clean containers, volumes, and build cache
make rebuild               # Rebuild containers from scratch
make status                # Show container status and health
```

## 💻 Local Development (Alternative)

If you prefer local development without Docker:

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/LynxPardelle/zoolandingpage.git
cd zoolandingpage

# Install dependencies
npm install

# Install NGX-Angora-CSS
npm install ngx-angora-css
```

### 2. Start Development

```bash
# Start development server
npm run start

# Open browser at http://localhost:4200
```

### 3. Available Scripts

```bash
npm run start         # Start dev server
npm run build         # Build for production
npm run watch         # Build and watch for changes
npm run test          # Run tests
npm run serve:ssr     # Serve SSR build
```

## 🌱 Environment Configuration

Customize your project by creating a `.env` file in the root directory. Use `.example.env` as a template:

```bash
# Application Settings
APP_NAME=zoolandingpage
ANGULAR_CREATE_OPTIONS=--routing --style=scss --ssr --standalone --strict

# Port Configuration  
DEV_PORT=6161                             # Development server port
PROD_PORT=6162                            # Production SSR server port
PROD_NO_SSR_PORT=6163                     # Production static server port

# Performance settings
NODE_OPTIONS=--max-old-space-size=4096    # Memory allocation for builds
NG_CLI_ANALYTICS=false                    # Disable Angular telemetry
DOCKER_BUILDKIT=1                         # Enable Docker BuildKit

# User Configuration (for file permissions)
UID=1000                                  # Host user ID
GID=1000                                  # Host group ID
```

## Quick Commands Reference

| Command | Docker | Local | Description |
|---------|--------|-------|-------------|
| **Development** |
| Start dev server | `make dev` | `npm start` | Hot-reload development |
| Background dev | `make dev-detached` | - | Background development server |
| View logs | `make dev-logs` | - | Show container logs |
| **Production** |
| SSR build | `make prod` | `npm run serve:ssr` | Server-side rendering |
| Static build | `make prod-no-ssr` | `npm run build` | Static files only |
| **Management** |
| Install package | `make install pkg=<name>` | `npm install <name>` | Add dependency |
| Health check | `make health` | - | Container health status |
| Clean up | `make clean` | `rm -rf node_modules` | Clean environment |

## 🔧 Troubleshooting

### Common Docker Issues

**Port already in use:**

```bash
make stop              # Stop all containers
make clean             # Clean everything
```

**Build errors:**

```bash
make debug             # Check compilation errors
make rebuild           # Rebuild from scratch
```

**Container health issues:**

```bash
make health            # Check container status
make logs              # View detailed logs
```

### Common Local Development Issues

**Node version conflicts:**

```bash
# Use Node Version Manager
nvm use 18
npm install
```

**Angular CLI issues:**

```bash
# Update Angular CLI
npm install -g @angular/cli@latest
ng version
```

**Package conflicts:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Next Steps

Once you have the development environment running:

1. **Read the [Project Overview](./README.md)** to understand the project goals
2. **Check the [Architecture Guide](./02-architecture.md)** for technical details
3. **Review [Development Guidelines](./03-development-guide.md)** for coding standards
4. **Explore [NGX-Angora-CSS Integration](./04-ngx-angora-css.md)** for styling
5. **Set up [Analytics](./05-analytics-tracking.md)** for user behavior tracking

Happy coding! 🧑‍💻
