# Voice Training Tracker

A desktop application built with Python and CustomTkinter to help track daily voice training progress, manage streaks, customize training plans, and optionally encrypt your data.

## Features

*   Track daily training sessions.
*   Maintain a daily streak counter (skips non-planned days).
*   Track total training sessions.
*   Mark specific days as sick/rest days to preserve streaks.
*   View and customize your daily training plan.
*   Configure which days of the week are planned training days.
*   Optional encryption for the save file to prevent manual editing of stats.
*   Simple, clean interface using CustomTkinter.

## Installation

You can run this application in two ways: using the pre-built executable (recommended for most users) or by running the Python script directly from the source code.

---

### Method 1: Using the Pre-built Executable (Recommended)

This is the simplest method and does not require Python to be installed on the user's computer.

1.  **Download:** Find the latest release and download the `.exe` file (e.g., `Voice Training Tracker.exe`) from the "Assets" section.
2.  **Save:** Save the downloaded `.exe` file to a convenient location on your computer (e.g., your Desktop or a dedicated folder).
3.  **Run:** Double-click the `Voice Training Tracker.exe` file to start the application.
4.  **First Run:**
    *   The application will automatically create a `voice_tracker_data.json` file in the same folder as the `.exe` to store your progress.
    *   If you enable encryption later, a `tracker_key.key` file will also be created there. **Do not delete `tracker_key.key` if you use encryption, or your data will be unrecoverable!**

    *   **Antivirus Warning:** Your antivirus software might flag the `.exe` file, especially the first time you run it. This is common for applications packaged with tools like PyInstaller. If you trust the source (this repository), you may need to add an exception in your antivirus settings.

---

### Method 2: Running from Source (Requires Python)

This method requires you to have Python and `pip` installed on your system.

1.  **Install Python:** If you don't have Python, download and install it from [python.org](https://www.python.org/downloads/). Version 3.8 or newer is recommended. Make sure to check the option "Add Python to PATH" during installation (on Windows).

2.  **Get the Code:**
    *   **Option A (Git):** If you have Git installed, clone the repository:
        ```bash
        git clone https://github.com/DasLykia/Voice-Steak-APP.git
        ```
    *   **Option B (Download ZIP):** Download the repository as a ZIP file from the main repository page (`Code` -> `Download ZIP`). Extract the ZIP file to a location on your computer and navigate into the extracted folder using your terminal (Command Prompt, PowerShell, Terminal).

3.  **Install Dependencies:** Open your terminal (Command Prompt, PowerShell, Terminal) in the project directory (where the Python files are) and install the required libraries:
    ```bash
    pip install -r requirements.txt
    ```
    *Alternatively, if `requirements.txt` is missing, install manually:*
    ```bash
    pip install customtkinter pytz cryptography
    ```

4.  **Run the Application:** Execute the main Python script from your terminal:
    ```bash
    python voice_tracker_app.py
    ```
    *(**Developer Note:** Ensure `voice_tracker_app.py` is the correct name of your main script file.)*

5.  **Files:** The `voice_tracker_data.json` and potentially `tracker_key.key` files will be created in the same directory where you run the script.

## Usage

*   Launch the application by double-clicking the `.exe` or running `python voice_tracker_app.py`.
*   Click **"✅ Train Today!"** to log a training session for the current day.
*   Click **"🛌 Mark as Sick / Rest Day"** if you cannot train due to illness or rest, preserving your streak on planned days.
*   The **Training Plan** area displays your current routine.
    *   Click **"✏️ Edit Plan Text"** to enable editing.
    *   Make your changes in the text box.
    *   Click **"💾 Save Plan Settings & Text"** to save changes and disable editing.
    *   Click the **"?"** button for a quick guide on editing (this button can be hidden).
*   Use the **Checkboxes** at the bottom to select your planned training days (Mon-Sun).
*   Use the **"Hide '?' Button"** checkbox to show/hide the editing guide button persistently.
*   Use the **"🔒 Encrypt Save File"** checkbox to toggle encryption for your `voice_tracker_data.json` file.
    *   **Warning:** If you enable encryption, a `tracker_key.key` file is generated. **Back up this key file!** If you lose it, your encrypted data cannot be recovered.
    *   Toggling encryption will rewrite the save file immediately.

## Dependencies

*   Python 3.x (3.8+ recommended)
*   customtkinter
*   pytz
*   cryptography

---
