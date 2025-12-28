# Fontscape

[中文文档](./README_CN.md)

Modern font browsing / management tool for Windows built with Tauri and React.

## Why do this?

- It can accurately filter fonts by language, and basically supports the languages ​​of the three East Asian countries that are planned to be improved.
- Able to view the corresponding CSS variable names

Windows' built-in font software is practically useless for language filtering. As a Chinese user, I really wanted a font browser that could truly filter Chinese fonts. That's why this project came about.

In addition, the font metadata on the internet is rather messy; for example, the CSS font-family of some Simplified Chinese fonts is Traditional Chinese name, etc. Therefore, we use the parsing priority of the browser to obtain the available CSS font-family name.

## TODO

- [] Fast startup
- [] Font preview with customizable size and text
- [] Smart search with pinyin support for Chinese fonts
- [] Font categorization and filtering by language and type
- [] Grid and Paper view modes
- [] Right-click context menu for quick actions
- [] Multi-select mode for batch operations
- [] Download from open source
- [] Install/Unstall/Toggle font

## Screenshots

![Main View](./docs/media/main.jpg)
![Modal View](./docs/media/font-modal.jpg)

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
git clone https://github.com/Sansui233/fontscape.git
cd fontscape
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

```
fontscape/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand stores
│   └── lib/                # Utilities and API
├── src-tauri/              # Rust backend
│   └── src/
│       ├── font/           # Font scanning and parsing
│       └── lib.rs          # Tauri commands
└── claude.md               # Technical architecture docs
```

## Development Roadmap

- [x] Phase 1: Basic framework setup
- [x] Phase 2: Font scanning and parsing
- [x] Phase 3: Font preview
- [x] Phase 4: Search functionality
- [ ] Phase 5: Font management (enable/disable)
- [ ] Phase 6: Categorization and filtering
- [ ] Phase 7: Font detail page
- [ ] Phase 8: Performance optimization
- [ ] Phase 9: Polish and release

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

GNU3.0

## Author

Sansui233
