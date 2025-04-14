# Voice Training Tracker

A desktop application built with Python and CustomTkinter to help track daily voice training progress, manage streaks, customize training plans, and optionally encrypt your data.

## Features

*   Track daily training sessions with a start/pause/stop timer.
*   Pause and resume the training timer during a session.
*   Maintain a daily streak counter (skips non-planned days and respects sick days).
*   Track total training sessions and average/total training time.
*   Mark specific days as sick/rest days (single or multiple days) to preserve streaks.
*   View and customize your daily training plan text.
*   Configure which days of the week are planned training days.
*   Optional encryption for the save file using a unique key.
*   Simple, clean interface using CustomTkinter with Light/Dark/System theme support.

## Installation

You can run this application in two ways: using the pre-built executable (recommended for most users) or by running the Python script directly from the source code.

---

### Method 1: Using the Pre-built Executable (Recommended)

This is the simplest method and does not require Python to be installed on the user's computer.

1.  **Download:** Go to the [Releases page](https://github.com/DasLykia/Voice-Streak-APP/releases) of this repository. Find the latest release and download the `.exe` file (e.g., `Voice Training Tracker.exe`) from the "Assets" section.
2.  **Save:** Save the downloaded `.exe` file to a convenient location on your computer (e.g., your Desktop or a dedicated folder).
3.  **Run:** Double-click the `Voice Training Tracker.exe` file to start the application.
4.  **First Run & Data Files:**
    *   The application will automatically create a `voice_tracker_data.json` file in the same folder as the `.exe` to store your progress.
    *   If you enable encryption later, a `tracker_key.key` file will also be created there.
    *   **CRITICAL:** If you use encryption, **back up your `tracker_key.key` file** somewhere safe! If you lose this file, your encrypted data will be **unrecoverable**.
    *   **Antivirus Warning:** Your antivirus software might flag the `.exe` file, especially the first time you run it. This is common for applications packaged with tools like PyInstaller. If you trust the source (this repository), you may need to add an exception in your antivirus settings.

---

### Method 2: Running from Source (Requires Python)

This method requires you to have Python and `pip` installed on your system.

1.  **Install Python:** If you don't have Python, download and install it from [python.org](https://www.python.org/downloads/). Version 3.8 or newer is recommended. Make sure to check the option "Add Python to PATH" during installation (on Windows).

2.  **Get the Code:**
    *   **Option A (Git):** If you have Git installed, clone the repository (Replace with your actual URL):
        ```bash
        git clone https://github.com/DasLykia/Voice-Steak-APP.git
        ```
    *   **Option B (Download ZIP):** Download the repository as a ZIP file from the main repository page (`Code` -> `Download ZIP`). Extract the ZIP file to a location on your computer.

3.  **Navigate:** Open your terminal (Command Prompt, PowerShell, Terminal) and navigate into the project directory (the one containing `app.py`, `config.py`, and `utils.py`).

4.  **Install Dependencies:** Install the required libraries using the `requirements.txt` file:
    ```bash
    pip install -r requirements.txt
    ```
    *(If `requirements.txt` is missing or outdated, you might need to install manually: `pip install customtkinter pytz cryptography`)*

5.  **Run the Application:** Execute the main application script from your terminal:
    ```bash
    python app.py
    ```

6.  **Files:** The `voice_tracker_data.json` and potentially `tracker_key.key` files will be created in the same directory where you run the script.

## Usage

*   Launch the application by double-clicking the `.exe` or running `python app.py`.
*   **Timer:**
    *   Click **"▶️ Start"** to begin timing a training session.
    *   While timing, click **"⏸️ Pause"** to pause the timer. The button will change to **"▶️ Resume"**.
    *   Click **"▶️ Resume"** to continue timing from where you left off.
    *   Click **"⏹️ Stop & Log"** to end the current session and record the accumulated time. The timer resets.
*   **Sick/Rest Days:**
    *   Click **"🛌 Sick (Today)"** to mark only the current day as a rest day (preserves streak).
    *   Click **"🗓️ Sick (Multi-Day)"** to enter the number of consecutive days (including today) to mark as rest days.
*   **Training Plan & Days:**
    *   The **Training Plan** text area displays your current routine.
    *   Click **"✏️ Edit Plan/Days"** to enable editing mode. This allows you to:
        *   Modify the text in the **Training Plan** area.
        *   Select/deselect your planned training days using the **Mon-Sun Checkboxes** below.
    *   Click **"💾 Save Settings & Text"** to save both the plan text and selected days, then exit editing mode.
    *   Click the **"?"** button for a quick guide on editing (this button can be hidden).
*   **Configuration:**
    *   Use the **"Hide '?' Button"** checkbox to show/hide the editing guide button persistently.
    *   Use the **"🔒 Encrypt Save File"** checkbox to toggle encryption for your `voice_tracker_data.json` file. (Requires app restart to take full effect if changing encryption status).
        *   **Warning:** Remember to back up the `tracker_key.key` file if encryption is enabled!
    *   Use the **Theme** dropdown to select the application appearance ("Light", "Dark", or "System" default).

## Project Structure

*   `app.py`: Main application logic, UI class, event handlers.
*   `config.py`: Application constants (file paths, default plan, etc.).
*   `utils.py`: Helper functions (e.g., time formatting).
*   `requirements.txt`: List of required Python packages.
*   `.gitignore`: Specifies files/folders for Git to ignore.
*   `README.md`: This file.

## Dependencies

*   Python 3.x (3.8+ recommended)
*   customtkinter
*   pytz
*   cryptography

---
