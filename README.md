# Font Manager

Modern font management tool for Windows built with Tauri and React.

## Features

- 🚀 Fast startup (< 1 second)
- 📝 Font preview with customizable size and text
- 🔍 Smart search with pinyin support for Chinese fonts
- 🎨 Modern UI with black/white flat design
- 📊 Font categorization and filtering
- ⚡ Virtual scrolling for performance
- 🎯 Enable/disable fonts with one click

## Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS + shadcn/ui
- Zustand (state management)
- TanStack Virtual (virtualization)
- Vite

### Backend
- Tauri 2.x
- Rust
- Windows API bindings
- ttf-parser (font parsing)

## Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Windows 10/11

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd font-manager
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri:dev
```

4. Build for production:
```bash
npm run tauri:build
```

## Project Structure

See [claude.md](./claude.md) for detailed technical architecture documentation.

## Development Roadmap

- [x] Phase 1: Basic framework setup
- [ ] Phase 2: Font scanning and parsing
- [ ] Phase 3: Font preview with virtualization
- [ ] Phase 4: Search functionality
- [ ] Phase 5: Font management (enable/disable)
- [ ] Phase 6: Categorization and filtering
- [ ] Phase 7: Font detail page
- [ ] Phase 8: Performance optimization
- [ ] Phase 9: Polish and release

## License

MIT

## Author

Created with ❤️ using Claude Code
