
# Gemini Live Desktop Assistant

A high-performance real-time conversational agent using Gemini 2.5 Live API, running as a professional desktop floating toolbar.

## Dual-Window Architecture

- **Floating Toolbar**: Frameless, transparent, always-on-top overlay.
- **Main Dashboard**: Full-featured window for settings and deep interactions (starts hidden/minimized).

## Desktop Files
- `electron.js`: The main entry point for the desktop shell.
- `package.json`: Contains Electron scripts and dependencies.

## Local Development

**Prerequisites:** Node.js

1. **Install dependencies:**
   `npm install`
2. **Set API Key:**
   Update `GEMINI_API_KEY` in `.env.local`
3. **Start Development Server:**
   `npm run dev`
4. **Launch Electron (In a separate terminal):**
   `npm run electron:dev`

## Building for Windows (.exe)

To generate a portable Windows installer:

1. **Build the web project:**
   `npm run build`
2. **Pack the Electron app:**
   `npm run electron:build`

The installer will be generated in the `release/` directory.

## Dragging
The floating capsule can be dragged anywhere on your desktop. Interactive buttons are automatically excluded from the drag region to ensure clicks are registered.
