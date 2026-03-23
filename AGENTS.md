# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ASCII Art SVG Generator - a Vue 3 web application that converts text into ASCII art using the figlet.js library and exports the results as high-quality SVG files. The app features real-time generation, dynamic font loading, keyboard shortcuts for font navigation, character width control, and advanced SVG export with pixel-to-shape conversion.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking only
npm run type-check

# Lint code with auto-fix
npm run lint

# Format code with prettier
npm run format

# Preview production build
npm run preview
```

## Architecture

### Core Structure
- **Vue 3** with Composition API and TypeScript
- **Vite** build system with hot module replacement
- **Vue Router** for single-page application routing
- **Pinia** for state management (minimal usage)
- **TailwindCSS** for utility-first styling
- **figlet.js** for ASCII art generation with dynamic font loading

### Key Components
- `AsciiArtGenerator.vue` - Main component containing all ASCII art generation logic, font selection, keyboard navigation, character width control, and advanced SVG export functionality
- `App.vue` - Root component with router outlet
- `HomeView.vue` - Simple wrapper for the main generator component

### Font System
The application now supports **295 ASCII fonts** with dynamic loading through a dedicated font loader utility. Fonts are loaded on-demand to optimize performance. The system includes:
- **Dynamic Font Loading**: Fonts are imported using Vite's dynamic imports when needed
- **Font Status Indicators**: Visual checkmarks show which fonts are loaded
- **Comprehensive Font Library**: From basic fonts like Standard and Big to specialized ones like Star Wars, Rammstein, and various artistic styles
- **Font Navigation**: Dropdown selection, Previous/Next buttons, and arrow key navigation (↑/↓)
- **Character Width Control**: Multiple width options including Full, Fitted, Controlled Smushing, Universal Smushing, and Default

### Font Loading Architecture
Located in `src/utils/fontLoader.ts`:
- **Static Import Mapping**: Pre-defined imports for all 295 figlet fonts for Vite compatibility
- **Lazy Loading**: Fonts are loaded only when requested
- **Load Status Tracking**: Reactive tracking of which fonts are loaded
- **Error Handling**: Graceful handling of font loading failures

### Advanced SVG Export Logic
Located in `AsciiArtGenerator.vue:275-475`, featuring sophisticated text-to-shape conversion:
- **High-Resolution Canvas Rendering**: Uses 2x pixel ratio for accurate text measurement
- **Pixel-to-Shape Conversion**: Converts rendered text to optimized SVG rectangles
- **Rectangle Merging Algorithm**: Advanced algorithm to find and merge adjacent pixels into larger rectangles for optimal SVG file size
- **Anti-aliasing Handling**: Proper threshold detection for anti-aliased text edges
- **Dimension Calculation**: Automatic SVG sizing based on actual text dimensions
- **Filename Sanitization**: Clean filenames based on input text and character width settings

### Character Width Options
The application provides fine-grained control over ASCII art appearance:
- **Full**: Maximum character spacing
- **Fitted**: Minimal character spacing
- **Controlled Smushing**: Controlled character overlap with specific rules
- **Universal Smushing**: Universal character overlap rules
- **Default**: Standard figlet spacing

### Keyboard Shortcuts
- `↑` (Up Arrow): Switch to previous font
- `↓` (Down Arrow): Switch to next font

## File Structure Notes

- **Main Logic**: All core functionality consolidated in `AsciiArtGenerator.vue`
- **Font Management**: Dedicated `src/utils/fontLoader.ts` utility for font operations
- **Type Definitions**: TypeScript definitions in `src/types/figlet-fonts.d.ts`
- **Routing**: Minimal router configuration with home and about routes
- **Styling**: TailwindCSS utility classes with responsive design
- **Build Configuration**: Multiple TypeScript configs for different build targets

## Development Notes

- **Import Alias**: `@` alias points to `src/` directory
- **Dynamic Font Loading**: Fonts are loaded on-demand using dynamic imports
- **Reactive UI**: Font loading status is tracked reactively for UI updates  
- **Canvas-based SVG Export**: Uses HTML5 Canvas for precise text-to-shape conversion
- **Error Handling**: Comprehensive error handling for font loading and ASCII generation
- **Performance Optimization**: Only loads fonts when needed, optimized SVG output
- **Vite Compatibility**: Font imports are statically defined for proper Vite bundling