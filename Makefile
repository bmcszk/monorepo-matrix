.PHONY: help install build test clean lint format check all

# Default target
help:
	@echo "Available commands:"
	@echo "  install   - Install dependencies"
	@echo "  build     - Build the action (creates dist/index.js)"
	@echo "  test      - Run tests"
	@echo "  lint      - Run linting"
	@echo "  format    - Format code"
	@echo "  check     - Run all quality checks (lint + test)"
	@echo "  clean     - Clean build artifacts"
	@echo "  all       - Run clean, install, build, and check"
	@echo "  local     - Test action locally using @github/local-action"

# Install dependencies
install:
	npm install

# Build the action
build:
	npm run build

# Install dependencies and build
all: clean install build check

# Run tests
test:
	npm test

# Run linting (check for common JavaScript issues)
lint:
	npx eslint index.js

# Format code
format:
	npx prettier --write index.js

# Clean build artifacts
clean:
	rm -rf dist/ node_modules/

# Run quality checks
check: lint test

# Test the action locally
local:
	npx @github/local-action action.yaml index.js .env