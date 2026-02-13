
# VoiceStride

**VoiceStride** is a desktop application built with **Electron and React** to help track daily voice training progress, manage streaks, customize training plans, and optionally record your sessions.

---

## Features ✨

*   **Training Modes** 🏋️:
    *   **Guided Routines**: Create structured workouts with timed blocks, descriptions, and custom prompts.
    *   **Open Practice**: Infinite timer mode for unstructured, free-form practice sessions.
    *   **Simple Plan**: Editable text area for quick notes during open sessions.
*   **Gamification & Progression** 🎮:
    *   **XP System**: Earn experience points for every minute trained and session completed.
    *   **Leveling**: Level up to unlock new **Color Themes** (Rose, Neon, Midnight, etc.).
    *   **Achievements**: Unlock badges for milestones like streaks, total duration, and consistency.
*   **Advanced Audio Analysis** 📊:
    *   **Real-time Pitch Tracker**: Visualize your current pitch against a target frequency (Hz) with a deviation bar.
    *   **Pitch Graphs**: Detailed Hz curves overlaying your recordings for post-session analysis.
    *   **Spectrum Visualizer**: Real-time audio frequency visualization.
*   **Vocal Health Tracking** ❤️:
    *   Log **Effort (1-10)** and **Clarity (1-5)** after every session.
    *   **Health Charts**: Visualize the relationship between session duration and vocal strain over time.
    *   **Journaling**: Attach notes to specific sessions to track how your voice felt.
*   **Analytics Dashboard** 📈:
    *   **Activity Heatmap**: GitHub-style visualization of your training consistency.
    *   **Detailed Stats**: Track total hours, recording volume, and most active days.
    *   **Goals Widget**: Set and track custom targets for streaks, session counts, or duration.
*   **Recording Studio** 🎧:
    *   **Pre-Flight Check**: Verify microphone gain and check ambient noise levels before starting.
    *   **Integrated Player**: Scrub through recordings with synchronized pitch analysis graphs.
    *   **Management**: Bulk delete, search, and filter recordings.
*   **Streak Management** 🔥:
    *   **Smart Streaks**: Tracks consecutive training on planned days.
    *   **Schedule Configuration**: Define your target training days (e.g., Mon, Wed, Fri).
    *   **Sick/Rest Days**: Mark days as "Sick" to preserve your streak without training.
*   **UI & UX** 🖥️:
    *   **Themes**: Switch between Light/Dark modes and unlockable accent colors.
*   **Desktop Integration** 💻:
    *   **Auto-Updates**: Seamless background updates via Velopack.
    *   **Offline First**: All data and recordings are stored locally on your machine.

---

## Installation 🛠️

You can run the app in two ways: **using the pre-built installer** or **from source**.

### Method 1: Using the Installer (Recommended) 🖱️

1. Go to the **Releases** page of this repository.
2. Download the latest `.exe` installer (e.g., `VoiceStride Setup 1.1.0.exe`).
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
git clone https://github.com/DasLykia/Voice-Streak-APP.git
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
* **pitchy** – Audio pitch detection algorithms
* **recharts** – Analytics charts
* **velopack** – Update framework
