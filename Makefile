# =============================================================================
# Makefile for Angular Application
# =============================================================================
# This Makefile provides convenient commands for Docker-based development
# and deployment workflows with enhanced functionality
# =============================================================================

# Load environment variables from .env file if it exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Set default values for environment variables
APP_NAME ?= my-angular-app
DEV_PORT ?= 6161
PROD_PORT ?= 6162
PROD_NO_SSR_PORT ?= 6163
UID ?= 1000
GID ?= 1000

# Colors for enhanced output formatting
CYAN=\033[0;36m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
BLUE=\033[0;34m
PURPLE=\033[0;35m
NC=\033[0m

# Default target when running 'make' without arguments
.DEFAULT_GOAL := help

# =============================================================================
# Help and Information Commands
# =============================================================================

help: ## Show this help message with all available commands
	@echo "$(CYAN)🐳 Angular - Docker Management$(NC)"
	@echo "$(CYAN)============================================$(NC)"
	@echo ""
	@echo "$(GREEN)🎯 Quick Start Commands:$(NC)"
	@echo "  quick-start       - 🚀 Complete setup for new developers"
	@echo "  onboarding        - 📚 New developer onboarding guide"
	@echo "  dev-setup         - 🛠️ Complete development environment setup"
	@echo ""
	@echo "$(GREEN)🚀 Development Commands:$(NC)"
	@echo "  dev               - Start development server with hot-reload"
	@echo "  dev-logs          - Show development container logs"
	@echo "  dev-shell         - Access development container shell"
	@echo ""
	@echo "$(GREEN)🏗️ Production Commands:$(NC)"
	@echo "  prod              - Start production server with SSR"
	@echo "  prod-detached     - Start production server with SSR (background)"
	@echo "  prod-no-ssr       - Start production server without SSR (Nginx)"
	@echo "  prod-no-ssr-detached - Start production without SSR (background)"
	@echo "  production-deploy - 🚀 Complete production deployment workflow"
	@echo ""
	@echo "$(GREEN)📦 Package Management:$(NC)"
	@echo "  install           - Install package (use: make install pkg=package-name)"
	@echo "  install-dev       - Install dev package (use: make install-dev pkg=package-name)"
	@echo "  update            - Update all packages to latest versions"
	@echo ""
	@echo "$(GREEN)🔧 Container Management:$(NC)"
	@echo "  stop              - Stop all containers"
	@echo "  restart           - Restart containers"
	@echo "  clean             - Clean containers, volumes, and build cache"
	@echo "  rebuild           - Rebuild containers from scratch"
	@echo "  prune             - Remove unused Docker resources"
	@echo "  validate          - Validate complete Docker setup"
	@echo ""
	@echo "$(GREEN)📊 Monitoring & Debugging:$(NC)"
	@echo "  status            - Show container status and health"
	@echo "  logs              - Show container logs (all services)"
	@echo "  health            - Check container health status"
	@echo "  debug             - Debug compilation errors"
	@echo "  inspect           - Inspect container configuration"
	@echo ""
	@echo "$(GREEN)🧪 Testing & Quality:$(NC)"
	@echo "  test              - Run unit tests in container"
	@echo "  test-watch        - Run unit tests in watch mode"
	@echo "  test-coverage     - Generate test coverage report"
	@echo "  test-e2e          - Run E2E tests"
	@echo "  test-component    - Run component tests in isolation"
	@echo "  lint              - Run linting checks"
	@echo "  build-check       - Check if build completes successfully"
	@echo "  code-quality      - 🔍 Run all code quality checks"
	@echo "  full-test-suite   - 🧪 Run complete test suite"
	@echo "  security-scan     - 🔒 Run security vulnerability scan"
	@echo "  performance-test  - ⚡ Run performance tests"
	@echo "  accessibility-test - ♿ Run accessibility tests"
	@echo ""
	@echo "$(GREEN)📚 Documentation & Utilities:$(NC)"
	@echo "  docs-serve        - 📖 Serve documentation locally"
	@echo "  demo-data         - 🎭 Setup demo data for development"
	@echo "  dev-workflow      - 🔄 Complete development workflow"
	@echo ""
	@echo "$(GREEN)💾 Backup & Restore:$(NC)"
	@echo "  backup            - Backup project data and configuration"
	@echo "  restore           - Restore from backup"
	@echo ""
	@echo "$(YELLOW)💡 Environment Variables (from .env):$(NC)"
	@echo "  APP_NAME: $(APP_NAME)"
	@echo "  DEV_PORT: $(DEV_PORT)"
	@echo "  PROD_PORT: $(PROD_PORT)"
	@echo "  PROD_NO_SSR_PORT: $(PROD_NO_SSR_PORT)"

# =============================================================================
# Development Commands
# =============================================================================

dev: ## Start development server with hot-reload
	@echo "$(CYAN)🚀 Starting development server...$(NC)"
	@echo "$(YELLOW)Port: $(DEV_PORT) | Container: $(APP_NAME)-dev$(NC)"
	docker-compose -p $(APP_NAME) --profile dev up --build

dev-detached: ## Start development server in background
	@echo "$(CYAN)🚀 Starting development server (background)...$(NC)"
	docker-compose -p $(APP_NAME) --profile dev up --build -d
	@echo "$(GREEN)✅ Development server started on port $(DEV_PORT)$(NC)"

dev-logs: ## Show development container logs
	@echo "$(CYAN)📋 Development container logs:$(NC)"
	docker-compose -p $(APP_NAME) logs -f dev

dev-shell: ## Access development container shell
	@echo "$(CYAN)🔧 Accessing development container shell...$(NC)"
	docker-compose -p $(APP_NAME) exec dev sh

# =============================================================================
# Production Commands
# =============================================================================

prod: ## Start production server with SSR
	@echo "$(CYAN)🏗️ Starting production server with SSR...$(NC)"
	@echo "$(YELLOW)Port: $(PROD_PORT) | Container: $(APP_NAME)-prod$(NC)"
	docker-compose -p $(APP_NAME) --profile prod up --build

prod-detached: ## Start production server with SSR in background
	@echo "$(CYAN)🏗️ Starting production server with SSR (background)...$(NC)"
	docker-compose -p $(APP_NAME) --profile prod up --build -d
	@echo "$(GREEN)✅ Production server started on port $(PROD_PORT)$(NC)"

prod-no-ssr: ## Start production server without SSR (Nginx)
	@echo "$(CYAN)🏗️ Starting production server without SSR...$(NC)"
	@echo "$(YELLOW)Port: $(PROD_NO_SSR_PORT) | Container: $(APP_NAME)-prod-no-ssr$(NC)"
	docker-compose -p $(APP_NAME) --profile prod-no-ssr up --build

prod-no-ssr-detached: ## Start production server without SSR in background
	@echo "$(CYAN)🏗️ Starting production server without SSR (background)...$(NC)"
	docker-compose -p $(APP_NAME) --profile prod-no-ssr up --build -d
	@echo "$(GREEN)✅ Production server (no-SSR) started on port $(PROD_NO_SSR_PORT)$(NC)"

# =============================================================================
# Container Management Commands
# =============================================================================

stop: ## Stop all containers
	@echo "$(CYAN)🛑 Stopping all containers...$(NC)"
	docker-compose -p $(APP_NAME) down

restart: ## Restart containers
	@echo "$(CYAN)🔄 Restarting containers...$(NC)"
	$(MAKE) stop
	$(MAKE) dev

clean: ## Clean containers, volumes, and build cache
	@echo "$(CYAN)🧹 Cleaning containers, volumes, and cache...$(NC)"
	docker-compose -p $(APP_NAME) down --volumes --remove-orphans
	@if exist "node_modules" rmdir /s /q node_modules
	@if exist "package-lock.json" del package-lock.json
	@if exist "dist" rmdir /s /q dist
	@if exist ".angular" rmdir /s /q .angular
	@echo "$(GREEN)✅ Cleanup completed$(NC)"

rebuild: ## Rebuild containers from scratch
	@echo "$(CYAN)� Rebuilding containers from scratch...$(NC)"
	$(MAKE) clean
	docker-compose -p $(APP_NAME) build --no-cache
	@echo "$(GREEN)✅ Rebuild completed$(NC)"

prune: ## Remove unused Docker resources
	@echo "$(CYAN)�️ Removing unused Docker resources...$(NC)"
	docker system prune -f
	docker volume prune -f
	@echo "$(GREEN)✅ Docker cleanup completed$(NC)"

# =============================================================================
# Package Management Commands
# =============================================================================

install: ## Install package (use: make install pkg=package-name)
ifndef pkg
	@echo "$(RED)❌ Error: Package name required. Use: make install pkg=package-name$(NC)"
	@exit 1
endif
	@echo "$(CYAN)📦 Installing package: $(pkg)$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm install $(pkg)
	@echo "$(GREEN)✅ Package $(pkg) installed$(NC)"

install-dev: ## Install dev package (use: make install-dev pkg=package-name)
ifndef pkg
	@echo "$(RED)❌ Error: Package name required. Use: make install-dev pkg=package-name$(NC)"
	@exit 1
endif
	@echo "$(CYAN)📦 Installing dev package: $(pkg)$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm install --save-dev $(pkg)
	@echo "$(GREEN)✅ Dev package $(pkg) installed$(NC)"

update: ## Update all packages to latest versions
	@echo "$(CYAN)🔄 Updating all packages...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm update
	@echo "$(GREEN)✅ Packages updated$(NC)"

# =============================================================================
# Monitoring & Debugging Commands
# =============================================================================

status: ## Show container status and health
	@echo "$(CYAN)📊 Container Status:$(NC)"
	docker-compose -p $(APP_NAME) ps
	@echo ""
	@echo "$(CYAN)🏥 Health Status:$(NC)"
	@docker ps --filter "name=$(APP_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

logs: ## Show container logs (all services)
	@echo "$(CYAN)📋 Container logs:$(NC)"
	docker-compose -p $(APP_NAME) logs -f

health: ## Check container health status
	@echo "$(CYAN)🏥 Checking container health...$(NC)"
	@for container in $$(docker ps --filter "name=$(APP_NAME)" --format "{{.Names}}"); do \
		echo "$(BLUE)Checking $$container...$(NC)"; \
		docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "No health check configured"; \
	done

debug: ## Debug compilation errors
	@echo "$(CYAN)🐛 Debug mode - checking for compilation errors...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng build --configuration development || \
	echo "$(RED)❌ Build failed - check logs above$(NC)"

inspect: ## Inspect container configuration
	@echo "$(CYAN)🔍 Container inspection:$(NC)"
	@for container in $$(docker ps --filter "name=$(APP_NAME)" --format "{{.Names}}"); do \
		echo "$(BLUE)Inspecting $$container...$(NC)"; \
		docker inspect $$container | jq '.[] | {Name: .Name, Image: .Config.Image, Ports: .NetworkSettings.Ports}'; \
	done

# =============================================================================
# Testing & Quality Commands
# =============================================================================

test: ## Run unit tests in container
	@echo "$(CYAN)🧪 Running unit tests...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng test --watch=false --browsers=ChromeHeadless

test-watch: ## Run unit tests in watch mode
	@echo "$(CYAN)🧪 Running unit tests in watch mode...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng test --watch=true --browsers=ChromeHeadless

test-coverage: ## Generate test coverage report
	@echo "$(CYAN)📊 Generating test coverage report...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng test --watch=false --browsers=ChromeHeadless --code-coverage
	@echo "$(GREEN)✅ Coverage report generated in coverage/ directory$(NC)"

test-e2e: ## Run E2E tests
	@echo "$(CYAN)🎭 Running E2E tests...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm run e2e || \
	echo "$(YELLOW)⚠️ E2E tests not configured yet$(NC)"

test-component: ## Run component tests in isolation
	@echo "$(CYAN)🧩 Running component tests...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm run test:component || \
	echo "$(YELLOW)⚠️ Component tests not configured yet$(NC)"

lint: ## Run linting checks
	@echo "$(CYAN)🔍 Running linting checks...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng lint

build-check: ## Check if build completes successfully
	@echo "$(CYAN)🏗️ Testing production build...$(NC)"
	docker-compose -p $(APP_NAME) exec dev ng build --configuration production
	@echo "$(GREEN)✅ Build check completed$(NC)"

# =============================================================================
# Backup & Restore Commands
# =============================================================================

backup: ## Backup project data and configuration
	@echo "$(CYAN)💾 Creating backup...$(NC)"
	@mkdir -p backups
	@echo "$(YELLOW)Backing up configuration files...$(NC)"
	@tar -czf backups/config-backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		package.json angular.json tsconfig.json docker-compose.yml Dockerfile .env 2>/dev/null || true
	@echo "$(GREEN)✅ Backup completed in backups/ directory$(NC)"

restore: ## Restore from backup (interactive)
	@echo "$(CYAN)� Available backups:$(NC)"
	@ls -la backups/*.tar.gz 2>/dev/null || echo "No backups found"
	@echo "$(YELLOW)To restore: tar -xzf backups/backup-file.tar.gz$(NC)"

# =============================================================================
# Utility Functions
# =============================================================================

# Check if required tools are installed
check-tools: ## Check if required tools are installed
	@echo "$(CYAN)🔍 Checking required tools...$(NC)"
	@command -v docker >/dev/null 2>&1 || (echo "$(RED)❌ Docker not found$(NC)" && exit 1)
	@command -v docker-compose >/dev/null 2>&1 || (echo "$(RED)❌ Docker Compose not found$(NC)" && exit 1)
	@echo "$(GREEN)✅ All required tools are installed$(NC)"

# Environment information
env-info: ## Display environment information
	@echo "$(CYAN)🌍 Environment Information:$(NC)"
	@echo "Project Name: $(APP_NAME)"
	@echo "App Name: $(APP_NAME)"
	@echo "Dev Port: $(DEV_PORT)"
	@echo "Prod Port: $(PROD_PORT)"
	@echo "UID: $(UID)"
	@echo "GID: $(GID)"

# =============================================================================
# Developer Experience Enhancement Commands
# =============================================================================

quick-start: ## 🚀 Complete project setup for new developers
	@echo "$(CYAN)🚀 Quick Start - Setting up Zoolandingpage...$(NC)"
	@echo "$(YELLOW)Step 1: Checking prerequisites...$(NC)"
	@$(MAKE) check-tools
	@echo "$(YELLOW)Step 2: Environment setup...$(NC)"
	@$(MAKE) env-info
	@echo "$(YELLOW)Step 3: Starting development environment...$(NC)"
	@$(MAKE) dev-detached
	@echo ""
	@echo "$(GREEN)✅ Setup Complete! Your development server is running at:$(NC)"
	@echo "$(CYAN)📱 Development: http://localhost:$(DEV_PORT)$(NC)"
	@echo ""
	@echo "$(YELLOW)💡 Useful Commands:$(NC)"
	@echo "  make dev-logs    - View development logs"
	@echo "  make dev-shell   - Access container shell"
	@echo "  make test        - Run tests"
	@echo "  make stop        - Stop all containers"

dev-setup: ## 🛠️ Complete development environment setup
	@echo "$(CYAN)🛠️ Setting up development environment...$(NC)"
	@$(MAKE) clean
	@$(MAKE) check-tools
	@$(MAKE) dev-detached
	@echo "$(GREEN)✅ Development environment ready!$(NC)"

code-quality: ## 🔍 Run all code quality checks
	@echo "$(CYAN)🔍 Running code quality checks...$(NC)"
	@echo "$(YELLOW)Running linting...$(NC)"
	@$(MAKE) lint
	@echo "$(YELLOW)Running tests...$(NC)"
	@$(MAKE) test
	@echo "$(YELLOW)Checking build...$(NC)"
	@$(MAKE) build-check
	@echo "$(GREEN)✅ All quality checks passed!$(NC)"

dev-workflow: ## 🔄 Complete development workflow (clean, setup, test)
	@echo "$(CYAN)🔄 Running complete development workflow...$(NC)"
	@$(MAKE) clean
	@$(MAKE) dev-setup
	@$(MAKE) code-quality
	@echo "$(GREEN)✅ Development workflow completed successfully!$(NC)"

production-deploy: ## 🚀 Complete production deployment workflow
	@echo "$(CYAN)🚀 Production deployment workflow...$(NC)"
	@echo "$(YELLOW)Step 1: Running quality checks...$(NC)"
	@$(MAKE) code-quality
	@echo "$(YELLOW)Step 2: Building production image...$(NC)"
	@$(MAKE) prod-detached
	@echo "$(YELLOW)Step 3: Verifying deployment...$(NC)"
	@$(MAKE) health
	@echo "$(GREEN)✅ Production deployment completed!$(NC)"

onboarding: ## 📚 New developer onboarding guide
	@echo "$(CYAN)📚 Zoolandingpage - Developer Onboarding$(NC)"
	@echo "$(CYAN)=========================================$(NC)"
	@echo ""
	@echo "$(GREEN)🎯 Welcome to Zoolandingpage!$(NC)"
	@echo "This is a modern Angular landing page with Docker-first development."
	@echo ""
	@echo "$(YELLOW)📋 Prerequisites:$(NC)"
	@echo "  ✓ Docker and Docker Compose installed"
	@echo "  ✓ Git configured"
	@echo "  ✓ Modern browser for testing"
	@echo ""
	@echo "$(YELLOW)🚀 Quick Start:$(NC)"
	@echo "  make quick-start     - Complete setup and start development"
	@echo "  make dev            - Start development server (foreground)"
	@echo "  make dev-logs       - View real-time logs"
	@echo "  make dev-shell      - Access container shell"
	@echo ""
	@echo "$(YELLOW)💻 Development Commands:$(NC)"
	@echo "  make test           - Run unit tests"
	@echo "  make lint           - Run code linting"
	@echo "  make code-quality   - Run all quality checks"
	@echo "  make clean          - Clean up containers"
	@echo ""
	@echo "$(YELLOW)🏗️ Production Commands:$(NC)"
	@echo "  make prod           - Start production server with SSR"
	@echo "  make prod-no-ssr    - Start static production server"
	@echo ""
	@echo "$(YELLOW)📚 Documentation:$(NC)"
	@echo "  docs/01-getting-started.md     - Getting started guide"
	@echo "  docs/03-development-guide.md   - Development standards"
	@echo "  docs/REQUIREMENTS_SUMMARY.md   - MANDATORY requirements"
	@echo ""
	@echo "$(GREEN)🎉 Ready to start? Run: make quick-start$(NC)"

docs-serve: ## 📖 Serve documentation locally
	@echo "$(CYAN)📖 Starting documentation server...$(NC)"
	@if command -v python3 >/dev/null 2>&1; then \
		echo "$(YELLOW)Documentation available at: http://localhost:8000$(NC)"; \
		cd docs && python3 -m http.server 8000; \
	elif command -v python >/dev/null 2>&1; then \
		echo "$(YELLOW)Documentation available at: http://localhost:8000$(NC)"; \
		cd docs && python -m SimpleHTTPServer 8000; \
	else \
		echo "$(RED)❌ Python not found. Install Python to serve docs.$(NC)"; \
	fi

demo-data: ## 🎭 Setup demo data for development
	@echo "$(CYAN)🎭 Setting up demo data...$(NC)"
	docker-compose -p $(APP_NAME) exec dev sh -c "\
		echo 'Setting up demo data...' && \
		npm run generate:demo-data || echo 'Demo data script not found - skipping'"
	@echo "$(GREEN)✅ Demo data setup completed$(NC)"

security-scan: ## 🔒 Run security vulnerability scan
	@echo "$(CYAN)🔒 Running security vulnerability scan...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm audit
	@echo "$(GREEN)✅ Security scan completed$(NC)"

performance-test: ## ⚡ Run performance tests
	@echo "$(CYAN)⚡ Running performance tests...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm run test:performance || \
	echo "$(YELLOW)⚠️ Performance tests not configured yet$(NC)"

accessibility-test: ## ♿ Run accessibility tests
	@echo "$(CYAN)♿ Running accessibility tests...$(NC)"
	docker-compose -p $(APP_NAME) exec dev npm run test:a11y || \
	echo "$(YELLOW)⚠️ Accessibility tests not configured yet$(NC)"

full-test-suite: ## 🧪 Run complete test suite
	@echo "$(CYAN)🧪 Running complete test suite...$(NC)"
	@$(MAKE) test
	@$(MAKE) security-scan
	@$(MAKE) performance-test
	@$(MAKE) accessibility-test
	@echo "$(GREEN)✅ Complete test suite finished!$(NC)"

# Mark all targets as PHONY to avoid conflicts with file names
.PHONY: help dev dev-detached dev-logs dev-shell prod prod-detached prod-no-ssr prod-no-ssr-detached \
        stop restart clean rebuild prune install install-dev update status logs health debug inspect \
        test test-watch test-coverage test-e2e test-component lint build-check backup restore check-tools validate validate-angular env-info \
        quick-start dev-setup code-quality dev-workflow production-deploy onboarding docs-serve \
        demo-data security-scan performance-test accessibility-test full-test-suite