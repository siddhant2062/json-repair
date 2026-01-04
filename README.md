# JSON Repair

A tool for visualizing JSON data in structured, interactive graphs, making it easier to explore, format, and validate JSON.

## Features

* **Visualizer**: Instantly convert JSON, YAML, CSV, XML, and TOML into interactive graphs or trees in dark or light mode.
* **Convert**: Seamlessly transform data formats, like JSON to CSV or XML to JSON, for easy sharing.
* **Format & Validate**: Beautify and validate JSON, YAML, and CSV for clear and accurate data.
* **Code Generation**: Generate TypeScript interfaces, Golang structs, and JSON Schema.
* **JSON Schema**: Create JSON Schema, mock data, and validate various data formats.
* **Advanced Tools**: Decode JWT, randomize data, and run jq or JSON path queries.
* **Export Image**: Download your visualization as PNG, JPEG, or SVG.
* **Privacy**: All data processing is local; nothing is stored on our servers.
* **Auto-Repair JSON**: Automatically detects and fixes 30+ malformed JSON patterns including unquoted keys, missing commas, escaped JSON, Python literals, garbage characters, URL encoding issues, and more.
* **5 View Modes**: Editor-only, Graph View, Tree View, Compare View, and Viewer mode for different use cases.
* **12 Converter Pages**: Covering JSON ↔ YAML, JSON ↔ XML, JSON ↔ CSV, YAML ↔ XML, YAML ↔ CSV, XML ↔ CSV.
* **16 Type Generation Pages**: Generate TypeScript interfaces, Golang structs, Rust serde, Kotlin data classes, and JSON Schema.
* **11 Advanced Modals**: Import/Export, JWT Decoder, jq Query, JSONPath, Type Generation, Schema Generator, cURL Import/Export, Base64 Encode/Decode, Node Details.

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 14.2** - React framework with SSR/SSG support
- **React 18.3** - UI library
- **TypeScript 5.8** - Type-safe JavaScript

### UI & Styling
- **Mantine UI 7.17** - Component library (`@mantine/core`, `@mantine/hooks`, `@mantine/dropzone`, `@mantine/code-highlight`)
- **Styled Components 6.1** - CSS-in-JS styling
- **React Icons 5.5** - Icon library

### Code Editor
- **Monaco Editor 4.7** - VS Code editor in the browser (`@monaco-editor/react`)

### State Management
- **Zustand 4.5** - Lightweight state management
- **React Query 5.76** - Server state management (`@tanstack/react-query`)

### JSON Processing & Repair
- **jsonrepair 3.13** - JSON repair library
- **jsonc-parser 3.3** - JSON with comments parser
- **jsonpath-plus 10.3** - JSONPath query support
- **json-schema-faker 0.5** - Generate mock data from JSON Schema

### Data Format Support
- **js-yaml 4.1** - YAML parsing and stringification
- **fast-xml-parser 5.2** - XML parsing
- **json-2-csv 5.5** - JSON to CSV conversion
- **toml 3.0** - TOML parsing

### Visualization
- **Reaflow 5.4** - Graph visualization library
- **React Window 2.2** - Virtualized lists for large datasets
- **React Zoomable UI 0.11** - Zoomable interface components
- **Allotment 1.20** - Resizable panes

### Type Generation
- **json_typegen_wasm 0.7** - Generate TypeScript/Go/Rust types from JSON
- **gofmt.js 0.0** - Go code formatting

### Utilities
- **jq-web 0.5** - jq query engine (WebAssembly)
- **jsonwebtoken 9.0** - JWT decoding
- **html-to-image 1.11** - Export visualizations as images
- **axios 1.9** - HTTP client
- **dayjs 1.11** - Date manipulation
- **lodash.debounce 4.0** - Debounce utility

### Development Tools
- **ESLint 8.56** - Code linting
- **Prettier 3.5** - Code formatting
- **TypeScript ESLint** - TypeScript-specific linting
- **Bundle Analyzer** - Analyze bundle size (`@next/bundle-analyzer`)

### Build & Deployment
- **Next.js Build System** - Production builds
- **next-sitemap 4.2** - Sitemap generation
- **Docker** - Containerization
- **pnpm 9.1** - Package manager

### Analytics & SEO
- **next-seo 6.8** - SEO optimization
- **nextjs-google-analytics 2.3** - Google Analytics integration

### Performance Optimizations
- Code splitting for Monaco Editor, Reaflow, and Mantine
- Virtualized rendering for large JSON files
- Debounced updates for real-time editing
- Hash-based caching for parsed JSON
- Lazy loading of heavy components

## 🚀 Quick Start (5 Minutes)

### Prerequisites

Before you begin, ensure you have:
- **Node.js** (Version: >=18.x) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **npm** (comes with Node.js)

### Automated Setup (Recommended)

**For macOS/Linux:**
```bash
# One-time setup
./setup.sh

# Start development server
./start-dev.sh
```

**For Windows:**
```cmd
:: One-time setup
setup.bat

:: Start development server
npm run dev
```

💡 **Tip:** The `start-dev.sh` script automatically handles all macOS-specific fixes!

### Manual Setup

```bash
# 1. Clone and navigate
git clone <repository-url>
cd json-repair

# 2. Install dependencies
npm install

# 3. Start server
# macOS: ./start-dev.sh
# Windows/Linux: npm run dev

# 4. Open http://localhost:3002
```

### Docker

🐳 A [`Dockerfile`](Dockerfile) is provided in the root of the repository.
If you want to run the application locally:

```console
# Build a Docker image with:
docker compose build

# Run locally with `docker-compose`
docker compose up

# Go to http://localhost:8888
```

### ⚠️ macOS Users

**Always use the automated script:**
```bash
./start-dev.sh
```

Auto-fixes: file limits, permissions, port conflicts, cache

📖 **Troubleshooting:** See [INSTALLATION.md](INSTALLATION.md)

## Configuration

The supported node limit can be changed by editing the `NEXT_PUBLIC_NODE_LIMIT` value in the `.env` file at the project root.

## ⚡ Performance

**Default View:** Tree view (faster initial load)
- Tree view: ~3-5 sec initial load
- Graph view: ~8-10 sec (switch via View menu)

**Production Mode:**
```bash
npm run build && npm start
```
Pre-compiled, instant loads (no hot reload)

---

## 🔄 CI/CD Pipeline

This repository uses **Jenkins** for automated builds and deployment:

### Automated Process:
1. **Create a Pull Request** - Jenkins automatically triggers
2. **Build & Test** - Validates code and runs tests
3. **Docker Build** - Builds Docker image
4. **Deploy** - Handles deployment automatically

**Managed by DevOps team** - No manual Docker builds needed!

---

## 🧪 Testing

### Test Suites

The project includes comprehensive test coverage for all JSON repair patterns:

**Backend Test Suite** (`test_suite.js`):
- 60 test cases covering all malformed JSON patterns
- Run: `node test_suite.js`
- Tests include: unquoted keys, missing commas, escaped JSON, Python literals, garbage characters, and more

**UI Test Suite** (`ui-test-runner.js`):
- 63 test cases (60 backend + 3 UI-specific)
- Verifies nested JSON unwrapping in UI context
- Run: `node ui-test-runner.js`

**Test Coverage:**
- ✅ **60 backend test cases** covering all malformed JSON patterns
- ✅ **63 UI test cases** (60 backend + 3 UI-specific unwrapping tests)
- ✅ Double-quoted headers field (real-world API logs) - TC_029
- ✅ Deeply nested escaped JSON (triple-level) - TC_009
- ✅ Array of escaped JSON strings - TC_012
- ✅ Mega nightmare test with ALL 29 patterns combined - TC_030
- ✅ URL encoding issues, control characters, number formats, BOM, and more

### JSONFixer Implementation

- **`src/lib/utils/jsonFixer.ts`** - Single TypeScript source used by both:
  - Next.js app (compiled for browser)
  - Node.js test scripts (via `ts-node`)

---

## 📖 Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Comprehensive installation & troubleshooting guide
- **[TESTING.md](TESTING.md)** - Complete testing documentation
- **[AUTO_REPAIR_LOGIC.md](AUTO_REPAIR_LOGIC.md)** - Detailed explanation of auto-repair system
- **[DOCKER_JENKINS_REQUIREMENTS.md](../DOCKER_JENKINS_REQUIREMENTS.md)** - CI/CD setup guide

### Setup Scripts

- **`setup.sh`** - Automated setup for macOS/Linux
- **`setup.bat`** - Automated setup for Windows
- **`start-dev.sh`** - Automated development server startup (macOS/Linux)

## 🏗️ Architecture

### Core Components

- **JSON Repair Engine** (`src/lib/utils/jsonFixer.ts`): 2917 lines of TypeScript handling 30+ malformed JSON patterns
- **State Management**: Zustand stores for file operations, JSON state, config, and modals
- **Editor**: Monaco Editor with auto-repair on paste and wrapper detection
- **Visualization**: 5 view modes (Editor, Graph, Tree, Compare, Viewer) with lazy loading
- **Format Conversion**: Support for JSON, YAML, XML, CSV, TOML
- **Type Generation**: TypeScript, Go, Rust, Kotlin, JSON Schema

### Performance Optimizations

- Size-based processing thresholds (50KB, 200KB, 500KB, 2MB)
- Debounced updates (400ms medium, 1000ms large content)
- Lazy loading of heavy components
- Hash-based caching for parsed JSON
- Virtualized tree view for large datasets
- Code splitting (Monaco, Reaflow, Mantine in separate chunks)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

### Quick Contribution Guide
1. Fork the repository
2. Create a feature branch from `integration` branch
3. Make your changes
4. Submit a Pull Request to `integration` branch

For detailed guidelines, branch structure, and naming conventions, see [CONTRIBUTING.md](CONTRIBUTING.md).
