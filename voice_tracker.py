# --- Required Libraries ---
from cryptography.fernet import Fernet, InvalidToken # For encrypting/decrypting the save file
import customtkinter as ctk # The UI framework
import json                 # For handling data saving/loading in JSON format
import os                   # For checking file existence (data file, key file)
from datetime import datetime, timedelta, date # For date/time calculations and tracking
import pytz                 # For handling timezones accurately
from tkinter import Toplevel # Used for the pop-up guide window (can use ctk.CTkToplevel too)

# --- Application Constants ---
DATA_FILE = "voice_tracker_data.json"       # Name of the file storing user data
KEY_FILE = "tracker_key.key"              # Name of the file storing the encryption key
TIMEZONE = pytz.timezone('Europe/Vienna') # Timezone for accurate daily tracking
APP_NAME = "Voice Training Tracker"         # Display name of the application
WINDOW_GEOMETRY = "1000x900"              # Initial size of the application window

# Default text content for the training plan area if no saved plan exists
DEFAULT_TRAINING_PLAN = """
Daily Plan (30-45 minutes)

1. Warm-up (5-10 minutes)
   - Diaphragmatic Breathing: 3x diaphragmatic breaths (in through the nose and out through the mouth). Breathe in to full capacity for 4 seconds, hold for 4 seconds, and breathe out for 6 seconds.
   - Light SOVTEs (Lip Trill or Straw Blowing): 3 minutes. Focus on a relaxed sound, not straining.
   - Lip Trill Explanation: To do a lip trill, gently close your lips together without pressing them tightly. Relax your cheeks. Purse your lips slightly, as if you were about to give a kiss. Then, push air through your lips, causing them to vibrate and create a "brrr" sound. The key is to keep your lips relaxed, so the air can move them freely. It's almost like making a motorboat sound.

2. Pitch Training (15-20 minutes)
   - Pitch Matching Exercise: Use a pitch tracker app (like Voice Tools on Android/iOS or Szimanski Generator on the web).
   - Goal: Aim for C4 as a starting point for pitch (look at pitch ranges in the document).
   - Method:
     - Use your pitch tracker to check the pitch of your voice.
     - Match the pitch that is shown in the program
   - Scales on SOVTEs: Use a lip trill (brrr) or a straw (see SOVTE's) while singing scales.
   - Focus: Smooth transitions between notes. Use a scale that is comfortable for you.
   - Duration: 5-10 minutes.

3. Resonance Training (10-15 minutes)
   - Big Dog/Small Dog Exercise: This is a key exercise for resonance.
   - Big Dog: Imagine panting like a large dog. This lowers the larynx and often results in a darker sound.
   - Small Dog: Imagine panting like a small dog. This raises the larynx and encourages a brighter sound. Aim for the raised larynx, more forward-placed sound of the small dog panting.
   - Focus: Feel the difference in the space inside your mouth and throat. Aim for the raised larynx, more forward-placed sound of the small dog panting.
   - Duration: 5-10 minutes.

4. Cool-down (2-3 minutes)
   - Gentle humming or lip trills at a comfortable pitch to relax your vocal cords.

Important Considerations:
- Hydration: Drink water before and after your practice. Staying hydrated is essential.
- Listen to Your Body: If you experience any pain or discomfort, STOP.
- Consistency is Key: Even 15-20 minutes of daily practice is better than a long session once a week.
- Record Yourself: Record yourself when doing these exercises.

Progression (What comes next after a few weeks):
- Vocal Weight:
  - Introduce the "Fawning" exercise. This helps thin the vocal weight. Focus on achieving a lighter, softer sound.
  - Fawning Exercise Explanation: The Fawning Exercise is about imitating the voice you have when fawning (imagining seeing a cute kitty and saying "Awww!"). It is essentially trying to make your voice sound "cuter."
  - Start by saying "aaaaaah" in a fawning voice, trying to keep your vocal cords lighter.
  - Then try saying "ah uh oh", focusing on maintaining the light vocal weight as you change the vowel sounds.
  - Finally, try saying "Pass the salt" with a fawning quality. The goal is to change the sentence to "pass it please".
- Reading Practice:
  - Once you feel more comfortable with pitch and resonance, incorporate reading practice using simple sentences like "Today I went to the park to see a balloon." (mentioned in the documents). Focus on maintaining your target pitch and resonance throughout the sentence.

Important Notes on the provided documents:
- "No voice is 'too deep' for voice feminization": This is crucial to remember. Progress is possible regardless of your starting point.
- Safety: Prioritize safety by avoiding overdoing it and paying attention to your body.
- Consistency is KEY: Just as the documents mention, keep doing the excercise everyday and record the progress.
"""

# --- Main Application Class ---
class VoiceTrackerApp(ctk.CTk):
    """
    The main application class for the Voice Training Tracker.
    Handles UI setup, data management (loading/saving/encryption),
    event handling, and daily tracking logic.
    """
    def __init__(self):
        """Initializes the application window, loads data, sets up UI, and schedules tasks."""
        super().__init__()

        # --- Window Setup ---
        self.title(APP_NAME)
        self.geometry(WINDOW_GEOMETRY)
        ctk.set_appearance_mode("System") # Use system theme (light/dark)
        ctk.set_default_color_theme("blue") # Set default color theme

        # --- Application State Variables ---
        self.is_plan_editing_enabled = False # Tracks if the training plan textbox is currently editable
        self.encryption_key = None          # Holds the loaded Fernet encryption key if encryption is active

        # --- Initialization Sequence ---
        # Load data first, as other parts depend on it (encryption status, etc.)
        self.data = self.load_data()

        # If the loaded data indicates encryption is enabled, try to load the key
        if self.data.get('encrypt_save_file'):
            self._load_key()

        # Perform initial check for streak resets or daily flag resets
        self.check_daily_reset_and_streak()

        # Create all the visual elements (buttons, labels, etc.)
        self.create_widgets()

        # Update the UI elements to reflect the current loaded data and state
        self.update_ui()

        # Schedule the first daily check (for streak resets etc.) for after midnight
        self.schedule_daily_check()

    # --- Encryption Key Management ---

    def _generate_and_save_key(self):
        """Generates a new Fernet encryption key and saves it to the key file."""
        try:
            key = Fernet.generate_key()
            # Write the key in binary mode ('wb')
            with open(KEY_FILE, "wb") as key_file:
                key_file.write(key)
            self.encryption_key = key # Store the newly generated key in memory
            print(f"New encryption key generated and saved to {KEY_FILE}")
            return key
        except Exception as e:
            # Handle potential errors during key generation or saving
            print(f"Error generating/saving key: {e}")
            self.status_label.configure(text=f"Error saving encryption key: {e}", text_color="red")
            self.encryption_key = None # Ensure key is not set if saving failed
            return None

    def _load_key(self):
        """Loads the encryption key from the specified key file."""
        # Check if the key file exists
        if not os.path.exists(KEY_FILE):
            print(f"Encryption key file ({KEY_FILE}) not found.")
            # If encryption is supposed to be enabled but key is missing, alert the user
            if self.data.get('encrypt_save_file'):
                 self.status_label.configure(text=f"Error: Encryption enabled but key file '{KEY_FILE}' missing!", text_color="red")
            self.encryption_key = None
            return None
        # Try to read the key file in binary mode ('rb')
        try:
            with open(KEY_FILE, "rb") as key_file:
                key = key_file.read()
            self.encryption_key = key # Store the loaded key in memory
            return key
        except Exception as e:
            # Handle potential errors during key loading
            print(f"Error loading key: {e}")
            self.status_label.configure(text=f"Error loading encryption key: {e}", text_color="red")
            self.encryption_key = None
            return None

    # --- Data Loading and Saving ---

    def load_data(self):
        """
        Loads application data from the DATA_FILE.
        Attempts to load as plain JSON first. If that fails,
        it attempts to decrypt the file using the key from KEY_FILE.
        Returns default data if the file doesn't exist or loading/decryption fails.
        """
        # Define the default structure and values for the application data
        default_data = {
            'current_streak': 0,
            'total_trainings': 0,
            'last_trained_date': None, # Store dates as YYYY-MM-DD strings
            'last_active_date': None,
            'sick_today': False,
            'planned_days': [0, 1, 2, 3, 4], # Default: Mon-Fri (0=Mon, 6=Sun)
            'training_plan_text': DEFAULT_TRAINING_PLAN,
            'show_edit_guide_button': True, # Whether to show the '?' guide button
            'encrypt_save_file': False     # Whether the save file should be encrypted
        }

        # If the data file doesn't exist, return the defaults
        if not os.path.exists(DATA_FILE):
            print(f"{DATA_FILE} not found. Starting with defaults.")
            return default_data

        data_content = None
        encryption_attempted = False
        loaded_data = {}

        # Step 1: Read the file content as raw bytes, as it might be encrypted
        try:
            with open(DATA_FILE, 'rb') as f:
                data_content = f.read()
        except Exception as e:
            print(f"Error reading {DATA_FILE}: {e}. Starting with defaults.")
            return default_data

        # Step 2: Try to decode and parse the content as plain JSON (UTF-8)
        try:
            json_string = data_content.decode('utf-8')
            loaded_data = json.loads(json_string)
            print("Data file loaded as plain JSON.")

        # Step 3: If JSON parsing fails, assume it might be encrypted
        except (json.JSONDecodeError, UnicodeDecodeError) as json_err:
            print(f"Could not parse {DATA_FILE} as JSON ({json_err}). Attempting decryption...")
            encryption_attempted = True
            key = self._load_key() # Attempt to load the encryption key

            if key: # If a key was successfully loaded
                try:
                    f = Fernet(key) # Initialize the Fernet cipher with the key
                    decrypted_data_bytes = f.decrypt(data_content) # Decrypt the raw bytes
                    # Decode the decrypted bytes back to a string and parse as JSON
                    loaded_data = json.loads(decrypted_data_bytes.decode('utf-8'))
                    print("Data file decrypted successfully.")
                    # Ensure the loaded data reflects that it came from an encrypted state
                    loaded_data['encrypt_save_file'] = True
                except InvalidToken:
                    # Handle decryption failure (wrong key, corrupted data)
                    print(f"Decryption failed: Invalid token or key. Data in {DATA_FILE} might be corrupted or key is wrong.")
                    self.status_label.configure(text=f"Error: Decryption failed! Check key file or data integrity.", text_color="red")
                    return default_data # Fallback to defaults
                except (json.JSONDecodeError, UnicodeDecodeError) as decrypt_json_err:
                    # Handle case where decryption works but the result isn't valid JSON
                    print(f"Decryption succeeded, but parsing decrypted data as JSON failed: {decrypt_json_err}")
                    self.status_label.configure(text=f"Error: Decrypted data is not valid JSON.", text_color="red")
                    return default_data # Fallback to defaults
                except Exception as decrypt_err:
                    # Catch any other unexpected decryption errors
                    print(f"An unexpected error occurred during decryption: {decrypt_err}")
                    self.status_label.configure(text=f"Error during decryption: {decrypt_err}", text_color="red")
                    return default_data # Fallback to defaults
            else:
                # Handle case where decryption was needed but the key wasn't available
                print(f"Cannot decrypt {DATA_FILE}: Key not available.")
                # Display error only if another key-related error isn't already shown
                if hasattr(self, 'status_label') and not self.status_label.cget("text").startswith("Error:"):
                    self.status_label.configure(text=f"Error: Cannot read {DATA_FILE} (not JSON, and no valid key found).", text_color="red")
                return default_data # Fallback to defaults

        # Catch any other unexpected errors during the loading process
        except Exception as e:
            print(f"An unexpected error occurred loading data: {e}. Starting with defaults.")
            return default_data

        # Step 4: Merge loaded data with defaults to ensure all keys exist
        final_data = default_data.copy() # Start with a fresh default structure
        final_data.update(loaded_data)    # Overwrite with any values loaded from the file

        # Step 5: Perform consistency checks on the encryption flag
        # If loaded as plain JSON but flag says encrypt -> warn user, fix flag
        if not encryption_attempted and final_data.get('encrypt_save_file'):
            print("Warning: Data loaded as plain JSON, but internal flag indicates encryption was expected. Disabling encryption flag.")
            if hasattr(self, 'status_label'): # Check if status label exists yet
                 self.status_label.configure(text="Warning: Save file was unencrypted. Disabling encryption setting.", text_color="orange")
            final_data['encrypt_save_file'] = False

        # If loaded encrypted but flag says no encrypt -> warn user, fix flag
        elif encryption_attempted and 'encrypt_save_file' in final_data and not final_data.get('encrypt_save_file'):
             print("Warning: Data loaded encrypted, but internal flag indicates no encryption. Enabling encryption flag.")
             final_data['encrypt_save_file'] = True # Correct the flag internally

        return final_data


    def save_data(self):
        """
        Saves the current application data (self.data) to DATA_FILE.
        Encrypts the data before saving if the 'encrypt_save_file' flag is True.
        """
        try:
            # Determine if encryption should be used based on the current setting
            should_encrypt = self.data.get('encrypt_save_file', False)

            if should_encrypt:
                # Ensure the encryption key is loaded in memory
                if not self.encryption_key:
                    print("Error saving: Encryption enabled but key not loaded.")
                    self.status_label.configure(text="Error: Cannot save encrypted data - key missing!", text_color="red")
                    # Attempt to load the key one more time
                    if not self._load_key() or not self.encryption_key:
                        return # Abort saving if key cannot be loaded

                print("Saving data with encryption...")
                f = Fernet(self.encryption_key)
                # Convert the data dictionary to a JSON string, then encode to bytes
                json_string = json.dumps(self.data, indent=4, ensure_ascii=False)
                encrypted_data = f.encrypt(json_string.encode('utf-8'))
                # Write the encrypted bytes to the file in binary mode ('wb')
                with open(DATA_FILE, 'wb') as file:
                    file.write(encrypted_data)
                print("Data saved encrypted.")

            else:
                # Save the data as plain, human-readable JSON text
                print("Saving data as plain JSON...")
                # Write the data dictionary directly as JSON text in UTF-8 encoding
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(self.data, f, indent=4, ensure_ascii=False)
                print("Data saved as plain JSON.")

        except Exception as e:
            # Handle potential errors during saving (e.g., file permissions)
            print(f"Error saving data: {e}")
            # Use self.after to schedule the status update, safer if called during app shutdown
            self.after(100, lambda: self.status_label.configure(text=f"Error saving data: {e}", text_color="red"))

    # --- Core Application Logic ---

    def get_today(self):
        """Returns the current date based on the configured TIMEZONE."""
        return datetime.now(TIMEZONE).date()

    def check_daily_reset_and_streak(self):
        """
        Checks if the application was inactive on planned training days
        and resets the streak accordingly. Also resets the 'sick_today' flag
        if it's a new day since the app was last active.
        """
        today = self.get_today()
        today_str = today.isoformat() # Convert to YYYY-MM-DD string

        last_active_str = self.data.get('last_active_date')
        last_trained_str = self.data.get('last_trained_date')
        streak_was_reset = False # Flag to check if save is needed

        # If the app was last active on a previous day, reset the sick flag
        if last_active_str != today_str:
            self.data['sick_today'] = False

        # Only perform streak check logic if the app was previously active on a different day
        if last_active_str and last_active_str != today_str:
            try:
                # Convert stored date strings back to date objects
                last_active_date = date.fromisoformat(last_active_str)
                last_trained_date = date.fromisoformat(last_trained_str) if last_trained_str else None

                # Iterate through each day between the last active day and today
                check_date = last_active_date + timedelta(days=1)
                while check_date < today:
                    day_of_week = check_date.weekday() # Monday is 0, Sunday is 6

                    # Check if this missed day was a scheduled training day
                    is_planned_day = day_of_week in self.data.get('planned_days', [])

                    # Check if training occurred on or after this potentially missed day
                    # (Handles cases where user trained later but missed an earlier planned day)
                    trained_on_or_after_missed_day = last_trained_date and last_trained_date >= check_date

                    # Reset streak if a planned day was missed and no training compensated for it
                    # Note: Being sick ('sick_today') only protects the streak for that specific day.
                    if is_planned_day and not trained_on_or_after_missed_day:
                         print(f"Streak reset: Missed planned training day {check_date.isoformat()} and no training recorded since.")
                         if self.data['current_streak'] > 0:
                             streak_was_reset = True # Mark that a reset happened
                         self.data['current_streak'] = 0
                         break # Stop checking once the streak is broken

                    check_date += timedelta(days=1) # Move to the next day

            except (ValueError, TypeError) as e:
                # Handle potential errors if date strings in the file are corrupted
                print(f"Error parsing dates during streak check: {e}")

        # Update the last active date to today if it changed or wasn't set
        if self.data.get('last_active_date') != today_str:
            self.data['last_active_date'] = today_str
            self.save_data() # Save the updated last active date (and potential streak reset)
        elif streak_was_reset:
             # Save even if last active date didn't change, because streak did
             self.save_data()

    # --- UI Construction ---

    def create_widgets(self):
        """Creates and arranges all the GUI elements within the main window."""
        # Configure grid layout - make the main column expandable
        self.grid_columnconfigure(0, weight=1)
        # Make the row containing the training plan text box expand vertically
        self.grid_rowconfigure(3, weight=1)

        # --- Frame for Streak and Total Counters ---
        counter_frame = ctk.CTkFrame(self)
        counter_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew") # Top row, padding
        counter_frame.grid_columnconfigure((0, 1), weight=1) # Make counter labels share space

        self.streak_label = ctk.CTkLabel(counter_frame, text="Daily Streak: 0 🔥", font=ctk.CTkFont(size=18, weight="bold"))
        self.streak_label.grid(row=0, column=0, padx=10, pady=10)

        self.total_label = ctk.CTkLabel(counter_frame, text="Total Trainings: 0 💪", font=ctk.CTkFont(size=18, weight="bold"))
        self.total_label.grid(row=0, column=1, padx=10, pady=10)

        # --- Frame for Action Buttons (Train/Sick) ---
        action_frame = ctk.CTkFrame(self)
        action_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        action_frame.grid_columnconfigure((0, 1), weight=1) # Make buttons share space

        self.train_button = ctk.CTkButton(action_frame, text="✅ Train Today!", command=self.confirm_training, font=ctk.CTkFont(size=14))
        self.train_button.grid(row=0, column=0, padx=10, pady=10, sticky="ew") # Expand horizontally

        self.sick_button = ctk.CTkButton(action_frame, text="🛌 Mark as Sick / Rest Day", command=self.mark_as_sick, fg_color="grey", hover_color="darkgrey", font=ctk.CTkFont(size=14))
        self.sick_button.grid(row=0, column=1, padx=10, pady=10, sticky="ew") # Expand horizontally

        # --- Status Label (for messages to the user) ---
        self.status_label = ctk.CTkLabel(self, text="Welcome!", font=ctk.CTkFont(size=12), wraplength=900) # Wrap long text
        self.status_label.grid(row=2, column=0, padx=20, pady=(0,10), sticky="ew")

        # --- Frame for the Training Plan Text Area ---
        plan_text_frame = ctk.CTkFrame(self)
        plan_text_frame.grid(row=3, column=0, padx=20, pady=10, sticky="nsew") # Expand in all directions
        plan_text_frame.grid_rowconfigure(1, weight=1)    # Allow the textbox row to grow vertically
        plan_text_frame.grid_columnconfigure(0, weight=1) # Allow the textbox column to grow horizontally

        # --- Sub-frame for Plan Label and '?' Guide Button ---
        plan_header_frame = ctk.CTkFrame(plan_text_frame, fg_color="transparent") # No background
        plan_header_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 0)) # Top of plan frame

        plan_label = ctk.CTkLabel(plan_header_frame, text="Your Training Plan:", font=ctk.CTkFont(size=14, weight="bold"))
        plan_label.pack(side=ctk.LEFT, pady=(0, 5)) # Place label on the left

        # Button to show the editing guide popup
        self.edit_guide_button = ctk.CTkButton(plan_header_frame, text="?", command=self.show_edit_guide, width=28, height=28, font=ctk.CTkFont(size=12, weight="bold"))
        self.edit_guide_button.pack(side=ctk.LEFT, padx=(10, 0), pady=(0, 5)) # Place next to label

        # --- Textbox for displaying/editing the training plan ---
        self.training_plan_textbox = ctk.CTkTextbox(plan_text_frame, wrap="word", font=ctk.CTkFont(size=12), border_width=1)
        self.training_plan_textbox.grid(row=1, column=0, padx=10, pady=(5, 10), sticky="nsew") # Expand in the grid cell
        # Load the initial text from data (or default)
        self.training_plan_textbox.insert("1.0", self.data.get('training_plan_text', DEFAULT_TRAINING_PLAN))
        # Start in read-only mode
        self.training_plan_textbox.configure(state="disabled")

        # --- Frame for Configuration Options (Training Days, Encryption, etc.) ---
        config_frame = ctk.CTkFrame(self)
        config_frame.grid(row=4, column=0, padx=20, pady=(10, 20), sticky="ew") # Bottom row
        config_frame.grid_columnconfigure(7, weight=1) # Allow rightmost column to expand (pushes hide checkbox right)

        config_label = ctk.CTkLabel(config_frame, text="Configure Training Days:", font=ctk.CTkFont(size=14, weight="bold"))
        config_label.grid(row=0, column=0, columnspan=8, padx=10, pady=(10, 0), sticky="w") # Span columns, stick left

        # --- Sub-frame for day selection checkboxes ---
        checkbox_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        checkbox_frame.grid(row=1, column=0, columnspan=8, padx=5, pady=(0, 5), sticky="w")
        self.day_vars = [] # List to hold the variables associated with each day checkbox
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i, day in enumerate(days):
            var = ctk.StringVar(value="off") # Use StringVar for checkbox state
            cb = ctk.CTkCheckBox(checkbox_frame, text=day, variable=var, onvalue="on", offvalue="off")
            cb.pack(side=ctk.LEFT, padx=5, pady=0) # Arrange checkboxes horizontally
            self.day_vars.append(var)

        # --- Sub-frame for plan editing buttons and hide guide checkbox ---
        plan_actions_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        plan_actions_frame.grid(row=2, column=0, columnspan=8, padx=5, pady=(5, 0), sticky="ew")
        plan_actions_frame.grid_columnconfigure(2, weight=1) # Push checkbox to the right

        # Button to enable editing the plan text
        self.enable_edit_button = ctk.CTkButton(plan_actions_frame, text="✏️ Edit Plan Text", command=self.enable_plan_editing, height=28)
        self.enable_edit_button.grid(row=0, column=0, padx=(5,5), pady=5, sticky="w")

        # Button to save both day settings and the edited plan text
        self.save_plan_button = ctk.CTkButton(plan_actions_frame, text="💾 Save Plan Settings & Text", command=self.save_plan_settings, height=28)
        self.save_plan_button.grid(row=0, column=1, padx=(0, 10), pady=5, sticky="w")

        # Checkbox to hide the '?' guide button
        self.hide_guide_var = ctk.StringVar(value="off")
        self.hide_guide_checkbox = ctk.CTkCheckBox(plan_actions_frame, text="Hide '?' Button", variable=self.hide_guide_var, onvalue="on", offvalue="off", command=self.toggle_guide_button_visibility)
        self.hide_guide_checkbox.grid(row=0, column=3, padx=(10,5), pady=5, sticky="e") # Stick to the right

        # --- Sub-frame for the encryption option ---
        encryption_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        encryption_frame.grid(row=3, column=0, columnspan=8, padx=5, pady=(0, 5), sticky="ew") # Row below edit buttons

        # Checkbox to enable/disable save file encryption
        self.encrypt_var = ctk.StringVar(value="off")
        self.encrypt_checkbox = ctk.CTkCheckBox(
            encryption_frame,
            text="🔒 Encrypt Save File (Requires restart after changing)", # Inform user about restart
            variable=self.encrypt_var,
            onvalue="on",
            offvalue="off",
            command=self.toggle_encryption # Link to the encryption toggle function
        )
        self.encrypt_checkbox.pack(side=ctk.LEFT, padx=5, pady=0) # Place on the left


    # --- UI Update Logic ---

    def update_ui(self):
        """
        Refreshes the state of all UI elements (labels, button states,
        checkboxes, text content) based on the current application data (self.data)
        and internal state flags (e.g., self.is_plan_editing_enabled).
        """
        # --- Update Top Counters ---
        self.streak_label.configure(text=f"Daily Streak: {self.data['current_streak']} 🔥")
        self.total_label.configure(text=f"Total Trainings: {self.data['total_trainings']} 💪")

        # --- Determine Current State ---
        today = self.get_today()
        today_str = today.isoformat()
        trained_today = self.data.get('last_trained_date') == today_str
        sick_today_flag = self.data.get('sick_today', False)
        editing_enabled = self.is_plan_editing_enabled # Use the internal flag
        default_text_color = ctk.ThemeManager.theme["CTkLabel"]["text_color"] # Get theme color

        # --- Update Status Label (Avoid overwriting error/warning messages) ---
        current_status_text = self.status_label.cget("text")
        current_status_color = self.status_label.cget("text_color")
        # Check if the current status message is an error or warning
        is_error_or_warning = current_status_color in ("red", "orange", "#FF9900") # Check common warning/error colors

        # Only update status label if it's not currently showing an important message
        if not is_error_or_warning:
            if trained_today:
                self.status_label.configure(text=f"Great job training today ({today_str})!", text_color=default_text_color)
            elif sick_today_flag:
                self.status_label.configure(text=f"Marked as sick/resting for {today_str}. Streak preserved.", text_color="orange")
            elif editing_enabled:
                 self.status_label.configure(text="Training plan text editing enabled. Remember to save!", text_color="orange")
            else: # Default state: neither trained, sick, nor editing
                # Check if today is a planned training day
                if today.weekday() in self.data.get('planned_days', []):
                    self.status_label.configure(text=f"Training planned for today ({today_str}). Go for it!", text_color=default_text_color)
                else: # It's a scheduled rest day
                    self.status_label.configure(text=f"Today ({today_str}) is a scheduled rest day.", text_color="gray")

        # --- Update Main Action Button States ---
        # Disable Train/Sick buttons if already trained, sick, or editing the plan
        action_button_state = "disabled" if (trained_today or sick_today_flag or editing_enabled) else "normal"
        self.train_button.configure(state=action_button_state)
        self.sick_button.configure(state=action_button_state)

        # Update button text based on state
        self.sick_button.configure(text="🛌 Resting Today" if sick_today_flag else "🛌 Mark as Sick / Rest Day")
        self.train_button.configure(text="✅ Trained Today!" if trained_today else "✅ Train Today!")

        # --- Update Plan Editing Button State ---
        # Disable the 'Edit' button only if editing is currently active
        self.enable_edit_button.configure(state="disabled" if editing_enabled else "normal")
        # Save button is always enabled, its action depends on whether changes exist

        # --- Update Day Selection Checkboxes ---
        planned_days = self.data.get('planned_days', [])
        for i, var in enumerate(self.day_vars):
            var.set("on" if i in planned_days else "off") # Set state based on loaded data

        # --- Update Guide Button Visibility & Checkbox ---
        show_guide = self.data.get('show_edit_guide_button', True) # Default to showing
        self.hide_guide_var.set("off" if show_guide else "on") # Set checkbox state
        # Use pack_forget() to hide or pack() to show the '?' button
        if show_guide:
            # Ensure the button is visible (add it back if it was forgotten)
            if not self.edit_guide_button.winfo_ismapped():
                # Re-pack the button in its original position relative to the label
                 self.edit_guide_button.pack(side=ctk.LEFT, padx=(10, 0), pady=(0, 5), before=self.edit_guide_button.master.winfo_children()[0])
        else:
            # Ensure the button is hidden
            if self.edit_guide_button.winfo_ismapped():
                 self.edit_guide_button.pack_forget()

        # --- Update Encryption Checkbox State ---
        self.encrypt_var.set("on" if self.data.get('encrypt_save_file', False) else "off")

        # --- Update Training Plan Textbox Content (if not currently being edited) ---
        if not editing_enabled:
            # Get the text currently displayed in the textbox
            current_text_in_box = self.training_plan_textbox.get("1.0", "end-1c")
            # Get the text stored in the application data
            saved_text = self.data.get('training_plan_text', DEFAULT_TRAINING_PLAN)
            # If they differ, update the textbox to match the saved data
            if current_text_in_box != saved_text:
                # Temporarily enable editing to change the text
                self.training_plan_textbox.configure(state="normal")
                self.training_plan_textbox.delete("1.0", "end") # Clear existing text
                self.training_plan_textbox.insert("1.0", saved_text) # Insert saved text
                self.training_plan_textbox.configure(state="disabled") # Disable editing again

    # --- Event Handlers and Actions ---

    def toggle_encryption(self):
        """
        Handles the event when the 'Encrypt Save File' checkbox is toggled.
        Updates the encryption setting, loads/generates the key if needed,
        and immediately resaves the data file in the new format (encrypted/plain).
        """
        # Get the current encryption state from data and the desired state from the checkbox
        currently_enabled = self.data.get('encrypt_save_file', False)
        wants_enabled = self.encrypt_var.get() == "on"

        # If the state isn't actually changing, do nothing
        if currently_enabled == wants_enabled:
            return

        action = "Enabling" if wants_enabled else "Disabling"
        print(f"{action} encryption...")

        if wants_enabled:
            # Action: Enable encryption
            # Try loading an existing key first
            if not self._load_key():
                # If loading failed, try generating a new key
                if not self._generate_and_save_key():
                    # If key generation/saving also fails, abort and revert the checkbox
                    self.encrypt_var.set("off")
                    self.status_label.configure(text="Failed to enable encryption: Key error.", text_color="red")
                    return
            # If key was loaded or generated successfully:
            self.data['encrypt_save_file'] = True # Update the setting in data
            self.status_label.configure(text="Encryption enabled. Saving file encrypted...", text_color="green")
            print("Saving encrypted data after enabling...")

        else:
            # Action: Disable encryption
            self.data['encrypt_save_file'] = False # Update the setting in data
            self.encryption_key = None # Clear the key from memory
            self.status_label.configure(text="Encryption disabled. Saving file unencrypted...", text_color="green")
            print("Saving plain JSON data after disabling...")

        # Immediately save the data file in the newly selected format
        self.save_data()

        # Schedule a UI update after a delay to reset the status message
        self.after(4000, self.update_ui)

    def confirm_training(self):
        """Handles the 'Train Today' button click event."""
        # Prevent action if the plan text is currently being edited
        if self.is_plan_editing_enabled:
            self.status_label.configure(text="Please save or discard plan text changes before logging training.", text_color="orange")
            return

        today = self.get_today()
        today_str = today.isoformat()
        yesterday = today - timedelta(days=1)
        yesterday_str = yesterday.isoformat()

        # Prevent action if already trained today or marked as sick
        if self.data.get('last_trained_date') == today_str or self.data.get('sick_today', False):
            return

        # --- Update Stats and Streak Logic ---
        streak_increased = False
        previous_streak = self.data['current_streak']

        self.data['total_trainings'] += 1 # Increment total count

        # Check streak continuation logic
        last_trained_str = self.data.get('last_trained_date')
        if last_trained_str == yesterday_str: # Trained yesterday -> continue streak
            self.data['current_streak'] += 1
        elif last_trained_str is None and self.data['current_streak'] == 0: # First training ever
             self.data['current_streak'] = 1
        elif last_trained_str: # Had previous training, but not yesterday
             # Check if the gap included any *planned* missed days
             last_trained_date = date.fromisoformat(last_trained_str)
             check_date = last_trained_date + timedelta(days=1)
             streak_broken = False
             while check_date < today:
                 if check_date.weekday() in self.data.get('planned_days', []):
                     streak_broken = True
                     break
                 check_date += timedelta(days=1)

             if streak_broken: # Missed a planned day -> reset streak
                 print(f"Streak broken. Starting new streak.")
                 self.data['current_streak'] = 1
             else: # Gap was only non-planned days -> continue streak
                 self.data['current_streak'] += 1
        else: # No previous training date, but maybe streak exists (edited file?) -> start at 1
             self.data['current_streak'] = 1

        # Check if the streak value actually went up
        if self.data['current_streak'] > previous_streak or (self.data['current_streak'] == 1 and previous_streak == 0) :
            streak_increased = True

        # --- Update Data and UI ---
        self.data['last_trained_date'] = today_str # Mark today as trained
        self.data['sick_today'] = False          # Training overrides sickness for the day
        self.data['last_active_date'] = today_str # Update last active day

        self.save_data() # Save changes (handles encryption automatically)
        self.update_ui() # Refresh the UI immediately

        # Show visual feedback if the streak increased
        if streak_increased:
            self.show_streak_feedback()

        print(f"Training confirmed for {today_str}")

    def mark_as_sick(self):
        """Handles the 'Mark as Sick / Rest Day' button click event."""
        # Prevent action if the plan text is currently being edited
        if self.is_plan_editing_enabled:
             self.status_label.configure(text="Please save or discard plan text changes first.", text_color="orange")
             return

        today = self.get_today()
        today_str = today.isoformat()

        # Prevent action if already marked sick or trained today
        if self.data.get('sick_today', False) or self.data.get('last_trained_date') == today_str:
            return

        # --- Update Data and UI ---
        self.data['sick_today'] = True       # Set the sick flag for today
        self.data['last_active_date'] = today_str # Ensure last active is updated for tomorrow's check

        self.save_data() # Save changes (handles encryption automatically)
        self.update_ui() # Refresh the UI immediately
        print(f"Marked as sick/resting for {today_str}")

    def enable_plan_editing(self):
         """Enables the training plan textbox for editing."""
         self.training_plan_textbox.configure(state="normal") # Make textbox editable
         self.is_plan_editing_enabled = True                # Set the internal flag
         # Update status label to inform the user
         self.status_label.configure(text="Training plan text editing enabled. Remember to save!", text_color="orange")
         self.training_plan_textbox.focus() # Automatically focus the textbox
         self.update_ui()                   # Refresh UI (disables the 'Edit' button itself)
         print("Training plan editing enabled.")

    def save_plan_settings(self):
        """
        Saves the selected training days and the current text from the
        training plan textbox. Disables editing mode afterwards.
        """
        # Get the list of selected training days from the checkboxes
        new_planned_days = []
        for i, var in enumerate(self.day_vars):
            if var.get() == "on":
                new_planned_days.append(i)

        # Get the current text from the plan textbox
        new_training_plan_text = self.training_plan_textbox.get("1.0", "end-1c")

        # Check if either the days or the text has actually changed
        days_changed = set(self.data.get('planned_days', [])) != set(new_planned_days)
        text_changed = self.data.get('training_plan_text', '') != new_training_plan_text
        data_was_changed = False # Flag to track if a save is needed

        # Update the internal data dictionary if changes were detected
        if days_changed:
            self.data['planned_days'] = new_planned_days
            print(f"Planned days updated: {self.data['planned_days']}")
            data_was_changed = True
        if text_changed:
            self.data['training_plan_text'] = new_training_plan_text
            print("Training plan text updated.")
            data_was_changed = True

        # --- Save Data and Update UI ---
        if data_was_changed:
            self.save_data() # Save the updated data (handles encryption)
            self.status_label.configure(text="Training plan settings and text saved!", text_color="green")
            # Schedule UI update after a delay to show confirmation message
            self.after(3000, self.update_ui)
        else:
            # Inform user if no changes were made
            self.status_label.configure(text="No changes detected in plan settings or text.", text_color="gray")
            self.after(3000, self.update_ui)

        # --- Disable Editing Mode ---
        self.training_plan_textbox.configure(state="disabled") # Make textbox read-only again
        self.is_plan_editing_enabled = False                 # Reset the internal flag
        # If no save occurred, update UI immediately to re-enable the 'Edit' button
        if not data_was_changed:
             self.update_ui()

    def show_streak_feedback(self):
        """Provides brief visual feedback (highlighting) when the streak increases."""
        # Get default colors to revert back to later
        default_fg_color = self.streak_label.cget("fg_color")
        default_text_color = ctk.ThemeManager.theme["CTkLabel"]["text_color"]
        highlight_color = ("#FFD700", "#FFBF00") # Gold-ish color (light/dark modes)

        # Apply temporary highlighting to the streak label
        self.streak_label.configure(fg_color=highlight_color, text_color="black")

        # Update status label (only if not showing error/warning/editing message)
        current_status_color = self.status_label.cget("text_color")
        if not (current_status_color in ("red", "orange", "#FF9900")):
             if not self.is_plan_editing_enabled:
                 self.status_label.configure(text=f"Streak increased to {self.data['current_streak']}! Keep it up! ✨", text_color="green")

        # Schedule reverting the highlight after 1.5 seconds
        self.after(1500, lambda: self.streak_label.configure(fg_color=default_fg_color, text_color=default_text_color))
        # Schedule resetting the status label after 4 seconds (using update_ui for consistency)
        self.after(4000, self.update_ui)

    def show_edit_guide(self):
        """Displays a pop-up window explaining how to edit the training plan."""
        # If the popup already exists, bring it to the front instead of creating a new one
        if hasattr(self, 'guide_popup') and self.guide_popup.winfo_exists():
            self.guide_popup.focus()
            return

        # Create a new top-level window for the guide
        self.guide_popup = ctk.CTkToplevel(self)
        self.guide_popup.title("How to Edit Training Plan")
        self.guide_popup.geometry("450x200") # Set popup size
        self.guide_popup.transient(self)     # Keep popup above the main window
        self.guide_popup.attributes("-topmost", True) # Try to ensure it's visible
        self.guide_popup.grab_set()          # Prevent interaction with main window while open

        # Text content for the guide
        guide_text = """
How to Edit Your Training Plan Text:

1. Click the '✏️ Edit Plan Text' button below the text area.
   This will make the text box editable.

2. Make your desired changes directly in the text box.

3. Click the '💾 Save Plan Settings & Text' button.
   This saves both your text changes and selected days.

4. Editing will be automatically disabled after saving.
"""
        # Display the guide text in a label
        label = ctk.CTkLabel(self.guide_popup, text=guide_text, justify=ctk.LEFT, font=ctk.CTkFont(size=12))
        label.pack(padx=20, pady=(20, 10), fill="both", expand=True)

        # Add an 'OK' button to close the popup
        close_button = ctk.CTkButton(self.guide_popup, text="OK", command=self.guide_popup.destroy)
        close_button.pack(padx=20, pady=(0, 15))

        # --- Center the popup relative to the main window ---
        self.guide_popup.update_idletasks() # Process pending events to get accurate window sizes
        # Get main window position and dimensions
        main_win_x = self.winfo_x(); main_win_y = self.winfo_y()
        main_win_width = self.winfo_width(); main_win_height = self.winfo_height()
        # Get popup dimensions
        popup_width = self.guide_popup.winfo_width(); popup_height = self.guide_popup.winfo_height()
        # Calculate centered position
        x_pos = main_win_x + (main_win_width // 2) - (popup_width // 2)
        y_pos = main_win_y + (main_win_height // 2) - (popup_height // 2)
        # Move the popup window
        self.guide_popup.geometry(f"+{x_pos}+{y_pos}")

    def toggle_guide_button_visibility(self):
        """
        Handles the event when the 'Hide '?' Button' checkbox is toggled.
        Updates the visibility setting in the data and saves it.
        """
        # Determine the desired state based on the checkbox ('on' means hide)
        show_button = self.hide_guide_var.get() == "off"
        # Update the setting in the application data
        self.data['show_edit_guide_button'] = show_button
        # Save the updated data (handles encryption if needed)
        self.save_data()
        # Refresh the UI immediately to show/hide the button
        self.update_ui()
        status = "shown" if show_button else "hidden"
        print(f"'How to Edit' button visibility set to: {status}")


    # --- Daily Scheduled Task ---

    def schedule_daily_check(self):
        """
        Calculates the time until shortly after the next midnight in the local
        timezone and schedules the 'run_scheduled_check' method to run then.
        """
        now_local = datetime.now(TIMEZONE) # Current time in the configured timezone
        # Calculate midnight today in the local timezone
        midnight_local_today = TIMEZONE.localize(datetime.combine(now_local.date(), datetime.min.time()))
        # Calculate midnight tomorrow
        midnight_local_tomorrow = midnight_local_today + timedelta(days=1)

        # Ensure 'now_local' is timezone-aware for correct subtraction
        if now_local.tzinfo is None:
             now_local = TIMEZONE.localize(now_local.replace(tzinfo=None))

        # Calculate seconds until 1 minute past midnight tomorrow
        delta_seconds = (midnight_local_tomorrow - now_local).total_seconds() + 60

        # Handle edge case if calculation results in negative time (e.g., run near midnight)
        if delta_seconds < 0: delta_seconds = 60 # Check again in 1 minute

        print(f"Scheduling next daily check in {delta_seconds:.0f} seconds.")
        # Cancel any previously scheduled check to prevent duplicates
        if hasattr(self, '_timer_id') and self._timer_id:
            self.after_cancel(self._timer_id)

        # Schedule the check using tkinter's 'after' method (time in milliseconds)
        self._timer_id = self.after(int(delta_seconds * 1000), self.run_scheduled_check)

    def run_scheduled_check(self):
        """
        This method is executed by the scheduled task. It performs the daily
        reset/streak check, updates the UI, and reschedules itself for the next day.
        """
        print(f"Running scheduled daily check... ({datetime.now(TIMEZONE)})")
        # Perform the daily logic checks
        self.check_daily_reset_and_streak()
        # Update the UI to reflect any changes (e.g., streak reset)
        self.update_ui()
        # Clear the stored timer ID
        self._timer_id = None
        # Schedule the check for the *next* day
        self.schedule_daily_check()


# --- Main Execution Block ---
if __name__ == "__main__":
    # This code runs only when the script is executed directly
    # (not when imported as a module)

    # Create an instance of the main application class
    app = VoiceTrackerApp()
    # Start the Tkinter event loop, making the application window interactive
    app.mainloop()