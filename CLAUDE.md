# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Action that detects changes in monorepo paths and generates build matrices for CI/CD workflows. The action analyzes git commits to determine which services/modules need to be rebuilt based on file changes.

## Key Architecture

- **Entry point**: `index.js` - Main action logic that parses git changes and maps them to services
- **Action metadata**: `action.yaml` - Defines inputs, outputs, and Node.js runtime configuration
- **Build output**: `dist/index.js` - Compiled action bundle created by ncc
- **Test suite**: `index.test.js` - Comprehensive Jest tests for all functions
- **Makefile**: `Makefile` - Build and test automation commands

### Core Logic Flow

1. **Input parsing**: `parseMap()` converts string path mappings to object structure
2. **Change detection**: `fetchGitChanges()` uses `git diff` to get changed files between commits
3. **Path matching**: `matchGitChanges()` uses wildcard matching to map changed files to services
4. **Matrix generation**: Returns list of affected services as JSON matrix

### Key Functions

- `parseMap()`: Parses mapping string format `path/pattern -> service1|service2`
- `getLastSuccessfulRun()`: Finds last successful workflow run via GitHub API
- `getBefore()/getAfter()`: Determines git commit range for comparison
- `matchGitChanges()`: Matches changed files against path patterns using wildcard-match

## Development Commands

```bash
# Install dependencies
npm install

# Build the action (creates dist/index.js)
npm run build

# Install build tool globally (one-time setup)
npm install -g @vercel/ncc

# Install dependencies and run all checks
make check

# Install dependencies and run all quality checks
make all

# Run tests (24 tests)
make test

# Lint code
make lint

# Format code (4 spaces)
make format

# Clean build artifacts
make clean

# Build and auto-commit dist changes
make build
```

## Testing

Comprehensive test suite with 24 tests:
- **Unit tests**: All individual functions tested with edge cases
- **Input validation**: Tests for null/undefined/invalid inputs
- **Integration tests**: Complete workflow simulation with mocked GitHub API
- **Error handling**: Git command failures and API error scenarios

## Input Format

The `map` input uses this format:
```
path/pattern -> service1|service2
```

Examples:
- `pkg/** -> consumer|producer` (wildcard for all files in pkg/)
- `services/consumer/** -> consumer` (specific service path)
- `go.mod -> consumer|producer` (single file affecting multiple services)

## Build Process

The action uses `@vercel/ncc` to bundle Node.js dependencies into a single `dist/index.js` file that GitHub Actions can execute. The bundle includes all dependencies from `package.json`.

## Priority 1 Fixes Implemented

- **GitHub Context Validation**: Checks for repository availability
- **Input Validation**: Handles null/undefined inputs gracefully
- **API Consistency**: Uses proper camelCase parameter naming (perPage)

## GitHub Actions CI/CD

The repository includes automated GitHub Actions workflows:
- **`.github/workflows/ci.yml`**: Main CI pipeline with quality gates
- **Auto-commit**: Commits `dist/index.js` changes automatically with `[skip ci]` flag
- **Quality gates**: Linting, testing, building, and formatting validation
- **Error handling**: Comprehensive input validation and error reporting

## Quality Standards

- **Code coverage**: 88.5%+ statements, 80.95% branches
- **ESLint**: Zero errors with 4-space indentation
- **Formatting**: 4-space indentation with Prettier
- **Testing**: All 24 tests passing
- **Production bundle**: Ready for deployment