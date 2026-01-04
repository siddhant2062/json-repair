# Installation & Usage Guide

A comprehensive guide for installing, configuring, and using JSON Repair - a powerful tool for visualizing, formatting, converting, and working with JSON and other data formats.

---

## 🎯 **Quick Start (Recommended)**

**macOS/Linux:**
```bash
./start-dev.sh
```

**Windows:**
```bash
npm run dev
```

The automated script handles all macOS-specific issues automatically.

---

## Table of Contents

- [🚀 Quick Start (For First-Time Users)](#-quick-start-for-first-time-users)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: Using pnpm (Recommended)](#method-1-using-pnpm-recommended)
  - [Method 2: Using npm](#method-2-using-npm)
  - [Method 3: Using yarn](#method-3-using-yarn)
  - [Method 4: Using Docker](#method-4-using-docker)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Features & Capabilities](#features--capabilities)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start (For First-Time Users)

**TL;DR - Get running in 5 minutes:**

### For macOS Users (Recommended):

```bash
# 1. Clone the repository
git clone <repository-url>
cd json-repair

# 2. Install dependencies
npm install

# 3. Start with automated script (handles all fixes)
./start-dev.sh

# 4. Open browser
# Visit: http://localhost:3002
```

### For Windows/Linux Users:

```bash
# 1. Clone the repository
git clone <repository-url>
cd json-repair

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open browser
# Visit: http://localhost:3002
```

### ✅ Success: Server ready at `http://localhost:3002`

### ⚠️ Common Issues:

| Error | Solution |
|-------|----------|
| `EMFILE` / `Operation not permitted` | macOS: Use `./start-dev.sh` |
| `Port already in use` | Use `./start-dev.sh` (auto-kills) |
| `npm command not found` | Install [Node.js](https://nodejs.org/) |
| Build errors | `rm -rf node_modules .next && npm install` |

📖 **For detailed troubleshooting, see [Troubleshooting](#troubleshooting) section below.**

---

## Prerequisites

Before installing JSON Repair, ensure you have the following installed on your system:

- **Node.js** (Version >= 18.x)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **Package Manager** (Choose one):
  - **pnpm** (Recommended) - Install: `npm install -g pnpm`
  - **npm** (Comes with Node.js)
  - **yarn** - Install: `npm install -g yarn`
- **Git** (For cloning the repository)
  - Download from [git-scm.com](https://git-scm.com/)
- **Docker** (Optional, for containerized deployment)
  - Download from [docker.com](https://www.docker.com/)

---

## Installation Methods

### Method 1: Using pnpm (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd jsoncrack
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```

4. **Access the application**
   - Open your browser and navigate to: `http://localhost:3002` (or port specified in start script)

### Method 2: Using npm

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd jsoncrack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Open your browser and navigate to: `http://localhost:3002` (or port specified in start script)

### Method 3: Using yarn

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd jsoncrack
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start the development server**
   ```bash
   yarn dev
   ```

4. **Access the application**
   - Open your browser and navigate to: `http://localhost:3002` (or port specified in start script)

### Method 4: Using Docker

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd jsoncrack
   ```

2. **Build the Docker image**
   ```bash
   docker compose build
   ```

3. **Run the container**
   ```bash
   docker compose up
   ```

4. **Access the application**
   - Open your browser and navigate to: `http://localhost:8888`

**Note:** To run in detached mode (background), use:
```bash
docker compose up -d
```

To stop the container:
```bash
docker compose down
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory to customize the application:

```env
# Node limit for graph visualization (default: varies)
NEXT_PUBLIC_NODE_LIMIT=1000

# Optional: Sentry configuration for error tracking
# SENTRY_DSN=your-sentry-dsn
# SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Optional: Google Analytics
# NEXT_PUBLIC_GA_ID=your-ga-id
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting checks
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm analyze` - Analyze bundle size

---

## Running the Application

### Development Mode

```bash
pnpm dev
```

- Runs on `http://localhost:3002` (default, can be changed via PORT env var)
- Hot module replacement enabled
- Development optimizations active

### Production Mode

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

3. **Access the application**
   - Open your browser and navigate to: `http://localhost:3002` (or port specified in start script)

---

## Building for Production

### Standard Build

```bash
pnpm build
```

This will:
- Optimize the code for production
- Generate static pages where possible
- Create optimized bundles
- Generate sitemap files

### Bundle Analysis

To analyze the bundle size:

```bash
pnpm analyze
```

This will generate a visual representation of your bundle sizes.

---

## Features & Capabilities

### 1. JSON Visualizer
- **Graph View**: Interactive node-based visualization of JSON structures
- **Tree View**: Hierarchical tree representation of data
- **Dark/Light Mode**: Toggle between themes
- **Export Options**: Download as PNG, JPEG, or SVG

### 2. Data Format Conversion
Convert between multiple formats:
- **JSON** ↔ **YAML**
- **JSON** ↔ **XML**
- **JSON** ↔ **CSV**
- **YAML** ↔ **XML**
- **YAML** ↔ **CSV**
- **XML** ↔ **CSV**

### 3. Format & Validate
- **JSON Formatter**: Beautify and format JSON with proper indentation
- **JSON Validator**: Validate JSON syntax and structure
- **YAML Validator**: Validate YAML syntax
- **CSV Validator**: Validate CSV structure

### 4. Code Generation
Generate code from your data:
- **TypeScript Interfaces**
- **Golang Structs**
- **Rust Serde**
- **Kotlin Data Classes**
- **JSON Schema**

### 5. JSON Schema Tools
- **Schema Generator**: Create JSON Schema from data
- **Schema Validator**: Validate data against JSON Schema
- **Mock Data Generator**: Generate sample data from schema

### 6. Advanced Tools
- **JSON Query (jq)**: Execute jq queries on your JSON
- **JSON Path**: Extract data using JSONPath expressions
- **JWT Decoder**: Decode and inspect JWT tokens
- **Data Randomizer**: Generate random data from existing structure
- **Compare View**: Compare two JSON documents side-by-side

### 7. Privacy & Security
- **100% Client-Side**: All processing happens in your browser
- **No Data Storage**: Your data never leaves your device
- **Secure**: No server-side data transmission

---

## Usage Examples

### Example 1: Visualizing JSON

1. Open the application at `http://localhost:3002`
2. Paste your JSON data into the editor
3. The graph visualization will appear automatically
4. Use the toolbar to switch between Graph View and Tree View
5. Export the visualization as an image if needed

### Example 2: Converting JSON to YAML

1. Navigate to the Converter section
2. Select "JSON to YAML"
3. Paste your JSON data
4. The converted YAML will appear automatically
5. Copy or download the result

### Example 3: Generating TypeScript Interface

1. Open the editor with your JSON data
2. Click on "Tools" → "Generate Type"
3. Select "TypeScript"
4. Copy the generated interface
5. Use it in your TypeScript project

### Example 4: Using JSON Query (jq)

1. Open the editor with your JSON data
2. Click on "Tools" → "JSON Query (jq)"
3. Enter your jq query (e.g., `.users[0].name`)
4. View the filtered results
5. Copy the output

### Example 5: Comparing Two JSON Documents

1. Navigate to the Compare view
2. Paste your first JSON in the left editor
3. Paste your second JSON in the right editor
4. View the differences highlighted
5. Use "Previous Difference" and "Next Difference" to navigate
6. Toggle "Ignore Format" to focus on structural differences

### Example 6: Validating JSON Schema

1. Navigate to "Tools" → "JSON Schema"
2. Enter your JSON data
3. Enter or generate a JSON Schema
4. Validate the data against the schema
5. View validation errors if any

---

## Troubleshooting

### 🔍 Summary of Known Issues

During testing on macOS (Darwin 25.0.0), the following critical issues were identified and resolved:

**Primary Issues:**
1. **EMFILE Error** - "Too many open files" error preventing compilation
2. **Permission Errors** - "Operation not permitted" when reading node_modules files
3. **macOS Quarantine** - Gatekeeper blocking file access in node_modules
4. **File Descriptor Limits** - Default macOS limit (256) too low for Next.js watchers

**Impact:** 
These issues prevented the development server from starting and caused build failures with errors like:
- `Watchpack Error (watcher): Error: EMFILE: too many open files`
- `Error: Failed to read source code... Operation not permitted (os error 1)`

**Quick Fix (macOS Users):**
```bash
# One-command solution for macOS
ulimit -n 10240 && \
xattr -r -d com.apple.quarantine node_modules 2>/dev/null && \
npm run dev
```

**Status:** ✅ Resolved - Server runs successfully on `http://localhost:3004` after applying fixes

---

### Issue: Port 3000 is already in use

**Solution:**
```bash
# Kill the process using port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
pnpm dev -- -p 3001
```

### Issue: Dependencies installation fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json pnpm-lock.yaml
pnpm install

# Or try with npm:
npm install
```

### ⚠️ Issue: "EMFILE: too many open files" Error (macOS)

**Problem:**
When running the development server on macOS, you may encounter:
```
Watchpack Error (watcher): Error: EMFILE: too many open files, watch
Error: Failed to read source code from .../node_modules/...
Caused by: Operation not permitted (os error 1)
```

This is a macOS-specific issue caused by:
1. Low file descriptor limit
2. macOS quarantine attributes on downloaded files
3. Multiple dev server instances running

**Solution:**

**Step 1: Kill all running dev servers**
```bash
pkill -f "next dev"
```

**Step 2: Clean and reinstall dependencies**
```bash
# Remove existing dependencies and build artifacts
rm -rf node_modules .next

# Reinstall with npm (requires full permissions on macOS)
npm install
```

**Step 3: Remove macOS quarantine attributes**
```bash
# This removes the quarantine flag that macOS applies to downloaded files
xattr -r -d com.apple.quarantine node_modules 2>/dev/null || true
```

**Step 4: Increase file descriptor limit and start server**
```bash
# Set higher file descriptor limit and start dev server
ulimit -n 10240 && npm run dev
```

**Alternative: One-line fix**
```bash
cd "JSON Repair" && \
pkill -f "next dev" && \
rm -rf node_modules .next && \
npm install && \
xattr -r -d com.apple.quarantine node_modules 2>/dev/null || true && \
ulimit -n 10240 && npm run dev
```

**Why this happens:**
- **File Descriptor Limit**: macOS has a default limit of 256 file descriptors per process. Next.js with its file watchers can easily exceed this.
- **Quarantine Attributes**: macOS marks downloaded files with `com.apple.quarantine` attribute, which can cause "Operation not permitted" errors when webpack tries to read them.
- **Multiple Instances**: Having multiple dev servers running simultaneously exhausts available file descriptors.

**Prevention:**
To permanently increase the file descriptor limit on macOS, add to your `~/.zshrc` or `~/.bash_profile`:
```bash
ulimit -n 10240
```

### Issue: "Operation not permitted" on node_modules files

**Problem:**
```
Error: Failed to read source code from /path/to/node_modules/...
Caused by: Operation not permitted (os error 1)
```

**Root Cause:**
macOS Gatekeeper applies quarantine attributes to files extracted from downloads, preventing certain operations.

**Solution:**
```bash
# Remove quarantine attributes from node_modules
xattr -r -d com.apple.quarantine node_modules

# If above doesn't work, reinstall with proper permissions
sudo chown -R $(whoami) node_modules
chmod -R u+w node_modules
```

### Issue: npm install fails with EPERM error

**Problem:**
```
npm error code EPERM
npm error syscall open
npm error errno -1
npm error Error: EPERM: operation not permitted
```

**Solution:**
This happens when running inside a sandboxed environment. Use one of these approaches:

**Option 1: Run with sudo (use cautiously)**
```bash
sudo npm install
```

**Option 2: Fix npm permissions**
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

**Option 3: Use a different package manager**
```bash
# Use npx to run pnpm without global installation
npx pnpm install
npx pnpm dev
```

### Issue: Build fails with memory errors

**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### Issue: Docker build fails

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache
```

### Issue: Monaco Editor not loading

**Solution:**
- Clear browser cache
- Check browser console for errors
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)

### Issue: Graph visualization is slow

**Solution:**
- Reduce the size of your JSON data
- Adjust `NEXT_PUBLIC_NODE_LIMIT` in `.env` file
- Use Tree View for large datasets

### Issue: TypeScript errors

**Solution:**
```bash
# Check TypeScript configuration
pnpm tsc --noEmit

# Fix linting issues
pnpm lint:fix
```

### Issue: First page load takes 5-10 seconds

**Problem:**
When you start the dev server and visit a page for the first time:
```
✓ Ready in 2.6s              ← Server starts fast
○ Compiling /editor ...       ← But then compiles on first visit
✓ Compiled /editor in 8.7s (2791 modules)
```

**Why this happens:**
- Next.js uses **on-demand compilation** in development mode
- Each page compiles only when visited for the first time
- The editor page has **2,791 modules** (Monaco editor, React Flow, graph libraries)
- First compilation includes all dependencies

**Solutions:**

**Quick Fix 1: Use Turbopack (Fastest)**
```bash
npm run dev:turbo
```
Benefits:
- ⚡ 5-10x faster compilation
- 🔥 700x faster updates after changes
- ✅ Built into Next.js 14+
- ✅ No configuration needed

**Quick Fix 2: Production Mode Locally**
```bash
# Build once (takes 1-2 minutes)
npm run build

# Run production server
npm start
```
Benefits:
- ✅ All pages pre-compiled
- ⚡ Instant page loads
- ✅ Production performance
- ❌ Need to rebuild after code changes

**Quick Fix 3: Keep Dev Server Running**
- Once a page is compiled, it stays cached
- Second visit to same page = instant
- Only restart when changing dependencies

**Advanced: Optimize Bundle Size**

If you want to permanently speed things up, optimize the bundle:

1. **Check bundle size:**
   ```bash
   npm run analyze
   ```

2. **Use dynamic imports for heavy components:**
   ```typescript
   // Instead of:
   import MonacoEditor from '@monaco-editor/react';
   
   // Use:
   const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
     ssr: false,
     loading: () => <div>Loading editor...</div>
   });
   ```

3. **Lazy load graph visualization:**
   ```typescript
   const GraphView = dynamic(() => import('./GraphView'), { ssr: false });
   ```

**Performance Comparison:**

| Method | First Load | After Changes | Hot Reload |
|--------|------------|---------------|------------|
| Regular `npm run dev` | 8-10s | 1-2s | ✅ |
| `npm run dev:turbo` | 2-3s | <100ms | ✅ |
| `npm run build && npm start` | Instant | N/A | ❌ |

**Recommendation:**
- **Daily development:** Use `npm run dev:turbo`
- **Testing/demo:** Use production mode
- **Production:** Use Docker (handled by Jenkins)

---

## Additional Resources

### Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save/Download JSON
- `Ctrl/Cmd + F` - Search in editor
- `Ctrl/Cmd + /` - Toggle comment
- `F11` - Toggle fullscreen
- `Ctrl/Cmd + K` - Command palette (if available)

### Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Performance Tips

1. **Large Files**: For files larger than 300KB, consider splitting the data
2. **Graph View**: Use Tree View for very large datasets
3. **Export**: Export visualizations as SVG for better quality
4. **Caching**: Enable browser caching for faster subsequent loads

---

## Support

If you encounter any issues not covered in this guide:

1. Check the browser console for error messages
2. Review the application logs
3. Ensure all dependencies are correctly installed
4. Verify Node.js version meets requirements (>= 18.x)

---

**Happy coding with JSON Repair! 🚀**

