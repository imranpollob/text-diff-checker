# Diffchecker

A simple, fast, and private text comparison tool that runs entirely in your browser.

**Live Demo:** [https://imranpollob.github.io/diffchecker/](https://imranpollob.github.io/diffchecker/)

## Features

- **Side-by-Side Diff**: Aligned split view with synchronized scrolling.
- **Word & Character Diff**: Choose between word-level or character-level difference highlighting.
- **Contiguous Highlighting**: Merges adjacent additions and removals into clean, readable blocks.
- **In-Diff Selection Actions**: Select text in either diff pane to **Copy**, **Replace** (centered dialog), or **Delete** with automatic re-diffing.
- **Editor Helpers**: Copy, paste, and clear buttons on each input pane, swap texts, and sample data loader.
- **Diff Options**:
  - Wrap lines (enabled by default)
  - Ignore blank lines
  - Ignore whitespace
  - Ignore case
- **Dark & Light Modes**: Automatically matches system preference or toggles manually.
- **100% Client-Side**: No backend, no accounts, and zero data leaves your browser.

## Getting Started

Because this is a pure static site with no dependencies or build steps, you can run it by opening `index.html` in any browser.

To run with a local server:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node
npx serve .
```

## Running Tests

To run the unit tests for the diff engine:

```bash
node test/diff-engine.test.js
```
