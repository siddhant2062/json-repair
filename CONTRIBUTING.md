# Contributing to JSON Repair

Thank you for your interest in contributing to JSON Repair! This document provides guidelines and instructions for contributing to this project.

## Branch Structure

Our project follows a structured branching strategy:

- **`main`** - Production-ready, stable code only
- **`release`** - Staging branch for testing before production
- **`integration`** - Development branch where all contributions are merged
- **`fb_jsonRepair`** - Feature branch (example)

## Getting Started

### 1. Fork the Repository

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/json-repair.git
   cd json-repair
   ```

### 2. Set Up Your Development Environment

1. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/siddhant2062/json-repair.git
   ```

2. Create a branch from `integration`:
   ```bash
   git fetch upstream
   git checkout -b feature/your-feature-name upstream/integration
   ```

### 3. Branch Naming Conventions

Please follow these naming conventions for your branches:

- **Features**: `feature/description` (e.g., `feature/json-parser-improvement`)
- **Bug Fixes**: `fix/description` (e.g., `fix/null-handling`)
- **Documentation**: `docs/description` (e.g., `docs/update-readme`)
- **Refactoring**: `refactor/description` (e.g., `refactor/error-handling`)

## Making Changes

1. **Make your changes** in your feature branch
2. **Write or update tests** if applicable
3. **Ensure all tests pass** locally
4. **Follow code style** and conventions used in the project
5. **Commit your changes** with clear, descriptive commit messages

### Commit Message Guidelines

- Use clear, descriptive messages
- Start with a verb in imperative mood (e.g., "Add", "Fix", "Update")
- Keep the first line under 72 characters
- Add more details in the body if needed

Example:
```
Add support for trailing commas in JSON arrays

This change allows the parser to handle trailing commas in JSON arrays,
which improves compatibility with some JSON-like formats.
```

## Submitting Changes

### 1. Keep Your Branch Updated

Before submitting a PR, make sure your branch is up to date:

```bash
git fetch upstream
git rebase upstream/integration
```

### 2. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 3. Create a Pull Request

1. Go to the [GitHub repository](https://github.com/siddhant2062/json-repair)
2. Click "New Pull Request"
3. Select `integration` as the base branch
4. Select your feature branch
5. Fill out the PR template completely
6. Submit the PR

## Pull Request Process

1. **Review**: All PRs will be reviewed by maintainers
2. **Feedback**: Address any feedback or requested changes
3. **Testing**: Ensure all tests pass and the code works as expected
4. **Merge**: Once approved, your PR will be merged into `integration`

## Code Review Guidelines

- Be respectful and constructive in your feedback
- Focus on the code, not the person
- Ask questions if something is unclear
- Be open to suggestions and improvements

## Development Workflow

```
Your Fork
    ↓
feature/xyz branch
    ↓
PR → integration (reviewed & merged)
    ↓
Testing & validation
    ↓
PR → release (staging)
    ↓
Final validation
    ↓
PR → main (stable/production)
```

## Questions?

If you have questions or need help, please:
- Open an issue on GitHub
- Check existing issues and discussions
- Reach out to maintainers

Thank you for contributing to JSON Repair! 🎉

