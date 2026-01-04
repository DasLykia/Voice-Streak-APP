# VoiceStride 🚀

**VoiceStride** is a desktop application built with **Electron and React** to help track daily voice training progress, manage streaks, customize training plans, and optionally record your sessions. It is a complete rework of the previous Python-based Voice Training Tracker.

---

## Features ✨

* **Daily Training Tracking** ⏱️: Start, pause, and stop a timer for each voice training session.
* **Daily Streak Counter** 🔥: Track how many consecutive planned training days you’ve completed. Skips non-planned days and respects sick days.
* **Total Training Counter** 🏋️: Counts all training sessions over time.
* **Timer Metrics** ⏳:

  * Current session timer.
  * Total time trained today.
  * Average training time per session.
  * Total accumulated training time.
* **Sick/Rest Days** 🛌: Mark specific days as sick or rest days, and preserve streaks.
* **Customizable Training Plan** ✏️: Default plan provided; users can edit and save it.
* **Training Days Selection** 📅: Select which days of the week you plan to train.
* **Recording Option** 🎤: Toggle session recording, choose input/output devices, pause recording along with the timer, and save recordings with timestamps.
* **Recording Management** 🎧:

  * Search and filter recordings.
  * Play, pause, adjust volume, and delete recordings.
* **UI & UX** 🖥️:

  * Modern, clean, and minimalistic design.
  * Configurable theme (Light, Dark, System).
  * Context feedback messages (“Saving… ✅ Saved!”, “Training Running…”)
* **Desktop Installation** 💻:

  * Installer creates desktop and start menu shortcuts.
  * Option to choose installation folder.
  * Settings and recordings are saved between sessions.

---

## Installation 🛠️

You can run the app in two ways: **using the pre-built installer** or **from source**.

### Method 1: Using the Installer (Recommended) 🖱️

1. Go to the **Releases** page of this repository.
2. Download the latest `.exe` installer (e.g., `VoiceStride Setup 0.1.0.exe`).
3. Run the installer and follow the prompts. You can choose:

   * Installation folder.
   * Whether to create desktop/start menu shortcuts.
4. After installation, launch the app from the desktop shortcut.
5. Settings, recordings, and progress will be saved in your local user folder (`AppData/Roaming/voicestride`).

> ⚠️ If you choose to uninstall, all data is **not automatically deleted**. Back up your files if needed.

---

### Method 2: Running from Source (Requires Node.js) 📦

1. Install Node.js (v18+ recommended).
2. Clone this repository:

```bash
git clone <your-repo-url>
cd Voice-Steak-APP
```

3. Install dependencies:

```bash
npm install
```

4. Run the app in development mode:

```bash
npm run dev
```

5. To build and run the packaged app:

```bash
npm run build
npm start
```

---

## What’s New in This Release 🆕

* Full rewrite from Python → **Electron + React** for cross-platform desktop support.
* Modern UI design with cleaner, minimalistic interface.
* Persistent settings and recordings saved between sessions.
* Added **recording management system**: search, filter, play, delete.
* Advanced timer metrics and training statistics.
* Installer now creates desktop and start menu shortcuts.
* Customizable training plan and selectable training days.
* Added **gain adjustment** for microphone input.
* Improved streak logic: skips non-training days, supports multiple sick/rest days.
* Optional recording toggle per session.

---

## Project Structure 🗂️

```
electron/          # Electron main and preload scripts
src/               # React frontend
public/            # Static assets
build/             # Installer icons, other build assets
.gitignore         # Ignored files for Git
package.json       # Node project config
README.md          # This file
```

---

## Dependencies 📦

* **Electron** – Desktop app framework
* **React** – Frontend UI
* **Vite** – Development & build tool
* **electron-store** – Persistent settings storage
* **lucide-react** – Icons
* **date-fns** – Date utilities

---

## License 📝

[MIT](LICENSE)
