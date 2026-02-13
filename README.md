# Resona

**Resona** is a desktop application built with **Electron and React** designed to track daily voice training progress, manage streaks, analyze pitch accuracy in real-time, and customize training routines.

---

## Features ✨

*   **Training Modes** 🏋️:
    *   **Guided Routines**: Create structured workouts with timed blocks, customizable practice prompts, and descriptions.
    *   **Open Practice**: Infinite timer mode for unstructured, free-form practice sessions.
    *   **Simple Plan**: Editable text area for quick notes during open sessions.
*   **Gamification & Progression** 🎮:
    *   **XP System**: Earn experience points for every minute trained and session completed.
    *   **Leveling**: Level up to unlock new **Color Themes**.
    *   **Achievements**: Unlock badges for milestones like streaks, total duration, and consistency.
*   **Advanced Audio Analysis** 📊:
    *   **High-Fidelity Pitch Tracker**: Powered by the **McLeod Pitch Method**, providing stable detection that filters out sibilance and background noise.
    *   **Pitch Graphs**: Detailed Hz curves overlaying your recordings for post-session analysis.
    *   **Spectrum Visualizer**: Real-time audio frequency visualization.
*   **Vocal Health Tracking** ❤️:
    *   Log **Effort (1-10)** and **Clarity (1-5)** after every session.
    *   **Health Charts**: Visualize the relationship between session duration and vocal strain over time.
    *   **Journaling**: Integrated notes attach directly to specific sessions.
*   **Analytics Dashboard** 📈:
    *   **Activity Heatmap**: GitHub-style visualization of your training consistency.
    *   **Detailed Stats**: Track total hours, recording volume, and most active days.
    *   **Goals Widget**: Set and track custom targets for streaks, session counts, or duration.
*   **Recording Studio** 🎧:
    *   **Pre-Flight Check**: Verify microphone gain and input levels before starting.
    *   **Integrated Player**: Scrub through recordings with synchronized pitch analysis graphs.
    *   **Management**: Bulk delete, search, and filter recordings.
*   **Streak Management** 🔥:
    *   **Smart Streaks**: Tracks consecutive training based on your custom schedule.
    *   **Schedule Configuration**: Define your specific training days (e.g., Mon, Wed, Fri).
    *   **Sick/Rest Days**: Mark days as "Sick" to preserve your streak without training.
*   **Desktop Integration** 💻:
    *   **Auto-Updates**: Seamless background updates via Velopack.
    *   **Offline First**: All data and recordings are stored locally on your machine.

---

## Installation 🛠️

You can run the app in two ways: **using the installer** or **building from source**.

### Method 1: Using the Installer (Recommended) 🖱️

1. Go to the **Releases** page of this repository.
2. Download the latest `Resona-win-Setup.exe`.
3. Run the executable.
   * *Note: The installation is silent and instant. The app will launch immediately after clicking.*
4. A shortcut will be created on your Desktop and Start Menu.
5. Settings, recordings, and progress are saved in your local user folder (`AppData/Roaming/Resona`).

---

### Method 2: Running from Source (Dev) 📦

1. **Prerequisites:**
   * Node.js (v18+ recommended)
   * .NET SDK (Required for Velopack packaging tools)

2. **Clone the repository:**
   ```bash
   git clone https://github.com/DasLykia/Voice-Streak-APP.git
   cd Voice-Streak-APP
