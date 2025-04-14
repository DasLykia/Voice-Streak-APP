# -*- coding: utf-8 -*-

# --- Required Libraries ---
import customtkinter as ctk     # UI framework
from customtkinter import CTkInputDialog # Input Dialog for sick days
from cryptography.fernet import Fernet, InvalidToken # Encryption
from datetime import datetime, timedelta, date # Date/Time handling
import json                     # Data serialization (load/save)
import os                       # File system operations (check file exists)
import pytz                     # Timezone handling
# import time                   # No longer directly needed here after splitting
from tkinter import Toplevel    # Base for CTkToplevel

# --- Local Imports ---
import config                   # Import constants from config.py
from utils import format_duration # Import helper function from utils.py


# --- Main Application Class ---
class VoiceTrackerApp(ctk.CTk):
    """
    Main application class for the Voice Training Tracker.

    Manages the graphical user interface (GUI), handles user interactions,
    loads and saves training data (with optional encryption), tracks daily
    progress, streaks, and training session times including pause/resume.
    """

    def __init__(self):
        """Initializes the application window, loads data, sets up UI, and schedules tasks."""
        super().__init__()

        # --- Basic Window Setup ---
        self.title(config.APP_NAME) # Use imported constant
        self.geometry(config.WINDOW_GEOMETRY) # Use imported constant
        ctk.set_appearance_mode("System")
        ctk.set_default_color_theme("blue")
        self.timezone = pytz.timezone(config.TIMEZONE_STR) # Use imported constant

        # --- Application State Variables ---
        self.is_plan_editing_enabled = False
        self.encryption_key = None
        self.is_timer_running = False
        self.is_timer_paused = False
        self.session_start_time = None
        self.paused_duration = timedelta(0)
        self.timer_update_job = None
        self._scheduled_check_timer_id = None
        self.original_streak_font_size = 18
        self.day_checkboxes = []

        # --- Initialization Sequence ---
        self.data = self.load_data()
        if self.data.get('encrypt_save_file'):
            self._load_key()
        self.check_daily_reset_and_streak()
        self.create_widgets()
        self.update_ui()
        self.schedule_daily_check()

    # --- Helper Methods ---

    def get_today(self):
        """Returns the current date based on the configured TIMEZONE."""
        return datetime.now(self.timezone).date()

    def is_currently_sick(self):
        """Checks if the current date falls within the stored sick period."""
        sick_until_str = self.data.get('sick_until_date')
        if not sick_until_str:
            return False
        try:
            sick_until_date_obj = date.fromisoformat(sick_until_str)
            today = self.get_today()
            return today <= sick_until_date_obj
        except (ValueError, TypeError):
            print(f"Warning: Invalid sick_until_date format '{sick_until_str}' encountered.")
            if self.data.get('sick_until_date') == sick_until_str:
                self.data['sick_until_date'] = None
                self.save_data()
            return False

    # --- Data Management (Load/Save/Encrypt) ---

    def load_data(self):
        """
        Loads application data from DATA_FILE.
        (See original code for detailed comments on logic)
        """
        default_data = {
            'current_streak': 0,
            'total_trainings': 0,
            'last_trained_date': None,
            'last_active_date': None,
            'sick_until_date': None,
            'planned_days': [0, 1, 2, 3, 4],
            # Use imported constant for default plan
            'training_plan_text': config.DEFAULT_TRAINING_PLAN,
            'show_edit_guide_button': True,
            'encrypt_save_file': False,
            'total_training_duration_seconds': 0.0,
            'daily_session_info': {'date': None, 'duration_seconds': 0.0}
        }

        # Use imported constant for data file path
        if not os.path.exists(config.DATA_FILE):
            print(f"{config.DATA_FILE} not found. Starting with defaults.")
            return default_data

        data_content = None
        try:
            # Use imported constant
            with open(config.DATA_FILE, 'rb') as f:
                data_content = f.read()
        except Exception as e:
            print(f"Error reading {config.DATA_FILE}: {e}. Starting with defaults.")
            return default_data

        loaded_data = {}
        encryption_attempted = False
        try:
            json_string = data_content.decode('utf-8')
            loaded_data = json.loads(json_string)
            print("Data file loaded as plain JSON.")
        except (json.JSONDecodeError, UnicodeDecodeError) as json_err:
            print(f"Could not parse {config.DATA_FILE} as JSON ({json_err}). Attempting decryption...")
            encryption_attempted = True
            key = self._load_key() # Tries to load key from config.KEY_FILE

            if key:
                try:
                    f = Fernet(key)
                    decrypted_data_bytes = f.decrypt(data_content)
                    loaded_data = json.loads(decrypted_data_bytes.decode('utf-8'))
                    print("Data file decrypted successfully.")
                    loaded_data['encrypt_save_file'] = True
                except InvalidToken:
                    print(f"Decryption failed: Invalid token/key. Data in {config.DATA_FILE} corrupt or key wrong?")
                    if hasattr(self, 'status_label'):
                        self.status_label.configure(text=f"Error: Decryption failed! Check key/data.", text_color="red")
                    return default_data
                except (json.JSONDecodeError, UnicodeDecodeError) as decrypt_json_err:
                    print(f"Decryption OK, but parsing decrypted JSON failed: {decrypt_json_err}")
                    if hasattr(self, 'status_label'):
                        self.status_label.configure(text=f"Error: Decrypted data not valid JSON.", text_color="red")
                    return default_data
                except Exception as decrypt_err:
                    print(f"Unexpected decryption error: {decrypt_err}")
                    if hasattr(self, 'status_label'):
                        self.status_label.configure(text=f"Error during decryption: {decrypt_err}", text_color="red")
                    return default_data
            else:
                print(f"Cannot decrypt {config.DATA_FILE}: Key not available/loaded.")
                if hasattr(self, 'status_label') and not self.status_label.cget("text").startswith("Error:"):
                     self.status_label.configure(text=f"Error: Cannot read {config.DATA_FILE} (not JSON, no key).", text_color="red")
                return default_data

        except Exception as e:
            print(f"An unexpected error occurred loading data: {e}. Starting with defaults.")
            return default_data

        # Merge and validate (logic remains the same)
        final_data = default_data.copy()
        if isinstance(loaded_data.get('daily_session_info'), dict):
            final_data['daily_session_info'].update(loaded_data.pop('daily_session_info'))
        elif 'daily_session_info' in loaded_data:
             print("Warning: Invalid 'daily_session_info' in data file. Using default.")
             if 'daily_session_info' in loaded_data: del loaded_data['daily_session_info']
        final_data.update(loaded_data)

        if 'sick_today' in final_data: # Migration logic
            if final_data['sick_today'] is True:
                last_active = final_data.get('last_active_date')
                final_data['sick_until_date'] = last_active if last_active else None
                print(f"Migrated 'sick_today=True' to 'sick_until_date={final_data['sick_until_date']}'.")
            del final_data['sick_today']

        if not encryption_attempted and final_data.get('encrypt_save_file'):
            print("Warning: Data loaded unencrypted, but flag says encrypted. Disabling flag.")
            if hasattr(self, 'status_label'):
                 self.status_label.configure(text="Warning: Save file unencrypted. Disabling encryption.", text_color="orange")
            final_data['encrypt_save_file'] = False
        elif encryption_attempted and 'encrypt_save_file' in final_data and not final_data.get('encrypt_save_file'):
             print("Warning: Data loaded encrypted, but flag says unencrypted. Enabling flag.")
             final_data['encrypt_save_file'] = True

        try: final_data['total_training_duration_seconds'] = float(final_data.get('total_training_duration_seconds', 0.0))
        except (ValueError, TypeError): final_data['total_training_duration_seconds'] = 0.0
        try:
            if isinstance(final_data.get('daily_session_info'), dict):
                 final_data['daily_session_info']['duration_seconds'] = float(final_data['daily_session_info'].get('duration_seconds', 0.0))
            else: final_data['daily_session_info'] = default_data['daily_session_info'].copy()
        except (ValueError, TypeError):
            if isinstance(final_data.get('daily_session_info'), dict): final_data['daily_session_info']['duration_seconds'] = 0.0
            else: final_data['daily_session_info'] = default_data['daily_session_info'].copy()

        sick_until = final_data.get('sick_until_date')
        if sick_until is not None:
            try: date.fromisoformat(sick_until)
            except (ValueError, TypeError): final_data['sick_until_date'] = None

        return final_data

    def save_data(self):
        """
        Saves the current application data (self.data) to DATA_FILE.
        (See original code for detailed comments on logic)
        """
        try:
            should_encrypt = self.data.get('encrypt_save_file', False)
            # Use imported constant for data file path
            file_path = config.DATA_FILE

            if should_encrypt:
                if not self.encryption_key:
                    print("Error saving: Encryption enabled but key not loaded/generated.")
                    self.status_label.configure(text="Error: Cannot save encrypted - key missing!", text_color="red")
                    if not self._load_key() or not self.encryption_key: return

                print("Saving data with encryption...")
                f = Fernet(self.encryption_key)
                json_string = json.dumps(self.data, indent=4, ensure_ascii=False)
                encrypted_data = f.encrypt(json_string.encode('utf-8'))
                with open(file_path, 'wb') as file:
                    file.write(encrypted_data)
                print("Data saved encrypted.")
            else:
                print("Saving data as plain JSON...")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(self.data, f, indent=4, ensure_ascii=False)
                print("Data saved as plain JSON.")

        except Exception as e:
            print(f"Error saving data: {e}")
            self.after(100, lambda: self.status_label.configure(text=f"Error saving data: {e}", text_color="red"))

    def _generate_and_save_key(self):
        """Generates a new Fernet encryption key and saves it to KEY_FILE."""
        try:
            key = Fernet.generate_key()
            # Use imported constant for key file path
            with open(config.KEY_FILE, "wb") as key_file:
                key_file.write(key)
            self.encryption_key = key
            print(f"New encryption key generated and saved to {config.KEY_FILE}")
            return key
        except Exception as e:
            print(f"Error generating/saving key: {e}")
            if hasattr(self, 'status_label'):
                 self.status_label.configure(text=f"Error saving encryption key: {e}", text_color="red")
            self.encryption_key = None
            return None

    def _load_key(self):
        """
        Loads the encryption key from KEY_FILE into self.encryption_key.
        Returns the key if successful, None otherwise.
        """
        key_file_path = config.KEY_FILE # Use imported constant
        if not os.path.exists(key_file_path):
            print(f"Encryption key file ({key_file_path}) not found.")
            if self.data.get('encrypt_save_file') and hasattr(self, 'status_label'):
                 self.status_label.configure(text=f"Error: Encryption enabled but key file '{key_file_path}' missing!", text_color="red")
            self.encryption_key = None
            return None
        try:
            with open(key_file_path, "rb") as key_file:
                key = key_file.read()
            if len(key) > 30:
                self.encryption_key = key
                print(f"Encryption key loaded successfully from {key_file_path}.")
                return key
            else:
                raise ValueError("Key file content seems too short.")
        except Exception as e:
            print(f"Error loading key from {key_file_path}: {e}")
            if hasattr(self, 'status_label'):
                self.status_label.configure(text=f"Error loading encryption key: {e}", text_color="red")
            self.encryption_key = None
            return None

    # --- Core Application Logic ---

    def check_daily_reset_and_streak(self):
        """
        Performs daily checks at startup and via scheduled task.
        (See original code for detailed comments on logic)
        """
        today = self.get_today()
        today_str = today.isoformat()
        last_active_str = self.data.get('last_active_date')
        last_trained_str = self.data.get('last_trained_date')
        sick_until_str = self.data.get('sick_until_date')
        daily_session_info = self.data.get('daily_session_info', {'date': None, 'duration_seconds': 0.0})
        data_changed = False

        # Handle Sick Period End
        if sick_until_str:
            try:
                sick_until_date_obj = date.fromisoformat(sick_until_str)
                if today > sick_until_date_obj:
                    self.data['sick_until_date'] = None
                    sick_until_str = None
                    data_changed = True
                    print(f"Sick period ended yesterday. Status cleared.")
            except (ValueError, TypeError):
                self.data['sick_until_date'] = None
                sick_until_str = None
                data_changed = True
                print(f"Invalid sick_until_date found. Status cleared.")

        # Reset Daily Timer
        if daily_session_info.get('date') != today_str:
            self.data['daily_session_info'] = {'date': today_str, 'duration_seconds': 0.0}
            data_changed = True
            print(f"New day detected. Daily timer reset.")

        # Streak Check
        if last_active_str and last_active_str != today_str:
            try:
                last_active_date = date.fromisoformat(last_active_str)
                last_trained_date = date.fromisoformat(last_trained_str) if last_trained_str else None
                current_streak = self.data.get('current_streak', 0)
                check_start_date = last_active_date + timedelta(days=1)
                if sick_until_str:
                    try:
                        sick_end_date = date.fromisoformat(sick_until_str)
                        if sick_end_date >= last_active_date and today > sick_end_date:
                           check_start_date = sick_end_date + timedelta(days=1)
                    except (ValueError, TypeError): pass

                check_date = check_start_date
                while check_date < today:
                    is_planned_day = check_date.weekday() in self.data.get('planned_days', [])
                    trained_on_or_after = last_trained_date and last_trained_date >= check_date
                    if is_planned_day and not trained_on_or_after:
                        print(f"Streak reset: Missed planned training day {check_date.isoformat()}.")
                        if current_streak > 0:
                            self.data['current_streak'] = 0
                            data_changed = True
                        break
                    check_date += timedelta(days=1)
            except (ValueError, TypeError) as e:
                print(f"Error parsing dates during streak check: {e}.")

        # Update Last Active Date
        if self.data.get('last_active_date') != today_str:
            self.data['last_active_date'] = today_str
            data_changed = True

        if data_changed:
             self.save_data()

    def log_training_completion(self, duration_seconds):
        """
        Updates training counts, durations, streak, and dates after a session.
        (See original code for detailed comments on logic)
        """
        today = self.get_today()
        today_str = today.isoformat()
        yesterday_str = (today - timedelta(days=1)).isoformat()
        data_changed = False
        show_streak_feedback = False

        # Clear Sick Status
        if self.data.get('sick_until_date') is not None:
            self.data['sick_until_date'] = None
            data_changed = True
            print("Training occurred, sick status cleared.")

        # Add Duration
        if duration_seconds > 0:
            if self.data.get('daily_session_info', {}).get('date') != today_str:
                 self.data['daily_session_info'] = {'date': today_str, 'duration_seconds': 0.0}
            self.data['daily_session_info']['duration_seconds'] += duration_seconds
            self.data['total_training_duration_seconds'] = self.data.get('total_training_duration_seconds', 0.0) + duration_seconds
            data_changed = True
            print(f"Logged {format_duration(duration_seconds)}. Daily total: {format_duration(self.data['daily_session_info']['duration_seconds'])}")

        # Update Counts and Streak (if not already trained today)
        if self.data.get('last_trained_date') != today_str:
            previous_streak = self.data.get('current_streak', 0)
            self.data['total_trainings'] = self.data.get('total_trainings', 0) + 1
            data_changed = True

            last_trained_str = self.data.get('last_trained_date')
            if last_trained_str == yesterday_str: self.data['current_streak'] += 1
            elif last_trained_str is None and previous_streak == 0: self.data['current_streak'] = 1
            elif last_trained_str:
                try:
                    last_trained_date = date.fromisoformat(last_trained_str)
                    check_date = last_trained_date + timedelta(days=1)
                    streak_broken = False
                    while check_date < today:
                        if check_date.weekday() in self.data.get('planned_days', []):
                            streak_broken = True; break
                        check_date += timedelta(days=1)
                    self.data['current_streak'] = 1 if streak_broken else self.data['current_streak'] + 1
                    if streak_broken: print(f"Streak broken before today (missed {check_date.isoformat()}).")
                except (ValueError, TypeError) as e:
                     print(f"Error parsing last_trained_date '{last_trained_str}': {e}. Resetting streak.")
                     self.data['current_streak'] = 1
            else: self.data['current_streak'] = 1

            current_streak = self.data.get('current_streak', 0)
            if current_streak > previous_streak or (current_streak == 1 and previous_streak == 0):
                show_streak_feedback = True

            self.data['last_trained_date'] = today_str
            print(f"Marked {today_str} as trained. New streak: {current_streak}. Total: {self.data['total_trainings']}.")

        # Update Last Active Date
        if self.data.get('last_active_date') != today_str:
            self.data['last_active_date'] = today_str
            data_changed = True

        if data_changed: self.save_data()
        if show_streak_feedback: self.show_streak_feedback()

    # --- UI Construction ---

    def create_widgets(self):
        """Creates and arranges all the GUI elements within the main window."""
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=0); self.grid_rowconfigure(1, weight=0)
        self.grid_rowconfigure(2, weight=0); self.grid_rowconfigure(3, weight=0)
        self.grid_rowconfigure(4, weight=1); self.grid_rowconfigure(5, weight=0)

        # Frame 1: Counters
        counter_frame = ctk.CTkFrame(self)
        counter_frame.grid(row=0, column=0, padx=20, pady=(20, 5), sticky="ew")
        counter_frame.grid_columnconfigure((0, 1), weight=1)
        self.streak_label = ctk.CTkLabel(counter_frame, text="Daily Streak: 0 🔥", font=ctk.CTkFont(size=self.original_streak_font_size, weight="bold"))
        self.streak_label.grid(row=0, column=0, padx=10, pady=10)
        self.total_label = ctk.CTkLabel(counter_frame, text="Total Trainings: 0 💪", font=ctk.CTkFont(size=18, weight="bold"))
        self.total_label.grid(row=0, column=1, padx=10, pady=10)

        # Frame 2: Time Display
        time_display_frame = ctk.CTkFrame(self)
        time_display_frame.grid(row=1, column=0, padx=20, pady=5, sticky="ew")
        time_display_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)
        self.live_timer_label = ctk.CTkLabel(time_display_frame, text="Timer: 00:00:00", font=ctk.CTkFont(size=14))
        self.live_timer_label.grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.today_time_label = ctk.CTkLabel(time_display_frame, text="Today: 00:00:00", font=ctk.CTkFont(size=14))
        self.today_time_label.grid(row=0, column=1, padx=5, pady=5, sticky="w")
        self.avg_time_label = ctk.CTkLabel(time_display_frame, text="Avg: 00:00:00", font=ctk.CTkFont(size=14))
        self.avg_time_label.grid(row=0, column=2, padx=5, pady=5, sticky="w")
        self.total_time_label = ctk.CTkLabel(time_display_frame, text="Total: 00:00:00", font=ctk.CTkFont(size=14))
        self.total_time_label.grid(row=0, column=3, padx=5, pady=5, sticky="w")

        # Frame 3: Action Buttons
        action_frame = ctk.CTkFrame(self)
        action_frame.grid(row=2, column=0, padx=20, pady=(5, 10), sticky="ew")
        action_frame.grid_columnconfigure((0, 1, 2, 3, 4), weight=1)
        self.start_timer_button = ctk.CTkButton(action_frame, text="▶️ Start", command=self.start_timer, font=ctk.CTkFont(size=14), fg_color="green", hover_color="darkgreen")
        self.start_timer_button.grid(row=0, column=0, padx=(10, 5), pady=10, sticky="ew")
        self.pause_resume_button = ctk.CTkButton(action_frame, text="⏸️ Pause", command=self.pause_resume_timer, font=ctk.CTkFont(size=14), fg_color="orange", hover_color="darkorange")
        self.pause_resume_button.grid(row=0, column=1, padx=5, pady=10, sticky="ew")
        self.stop_timer_button = ctk.CTkButton(action_frame, text="⏹️ Stop & Log", command=self.stop_timer, font=ctk.CTkFont(size=14), fg_color="red", hover_color="darkred")
        self.stop_timer_button.grid(row=0, column=2, padx=5, pady=10, sticky="ew")
        self.sick_button = ctk.CTkButton(action_frame, text="🛌 Sick (Today)", command=self.mark_as_sick, fg_color="grey", hover_color="darkgrey", font=ctk.CTkFont(size=14))
        self.sick_button.grid(row=0, column=3, padx=5, pady=10, sticky="ew")
        self.sick_multi_button = ctk.CTkButton(action_frame, text="🗓️ Sick (Multi)", command=self.mark_sick_multiple_days, fg_color="grey", hover_color="darkgrey", font=ctk.CTkFont(size=14))
        self.sick_multi_button.grid(row=0, column=4, padx=(5, 10), pady=10, sticky="ew")

        # Row 4: Status Label
        self.status_label = ctk.CTkLabel(self, text="Welcome!", font=ctk.CTkFont(size=12), wraplength=950)
        self.status_label.grid(row=3, column=0, padx=20, pady=(0, 10), sticky="ew")

        # Frame 5: Training Plan
        plan_text_frame = ctk.CTkFrame(self)
        plan_text_frame.grid(row=4, column=0, padx=20, pady=10, sticky="nsew")
        plan_text_frame.grid_rowconfigure(1, weight=1); plan_text_frame.grid_columnconfigure(0, weight=1)
        plan_header_frame = ctk.CTkFrame(plan_text_frame, fg_color="transparent")
        plan_header_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 0))
        ctk.CTkLabel(plan_header_frame, text="Your Training Plan:", font=ctk.CTkFont(size=14, weight="bold")).pack(side=ctk.LEFT, pady=(0, 5))
        self.edit_guide_button = ctk.CTkButton(plan_header_frame, text="?", command=self.show_edit_guide, width=28, height=28, font=ctk.CTkFont(size=12, weight="bold"))
        self.edit_guide_button.pack(side=ctk.LEFT, padx=(10, 0), pady=(0, 5))
        self.training_plan_textbox = ctk.CTkTextbox(plan_text_frame, wrap="word", font=ctk.CTkFont(size=12), border_width=1)
        self.training_plan_textbox.grid(row=1, column=0, padx=10, pady=(5, 10), sticky="nsew")
        # Use imported constant for default plan text
        self.training_plan_textbox.insert("1.0", self.data.get('training_plan_text', config.DEFAULT_TRAINING_PLAN))
        self.training_plan_textbox.configure(state="disabled")

        # Frame 6: Configuration
        config_frame = ctk.CTkFrame(self)
        config_frame.grid(row=5, column=0, padx=20, pady=(10, 20), sticky="ew")
        config_frame.grid_columnconfigure(3, weight=1)
        ctk.CTkLabel(config_frame, text="Configuration:", font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, columnspan=4, padx=10, pady=(10, 5), sticky="w")
        # Day Checkboxes
        checkbox_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        checkbox_frame.grid(row=1, column=0, columnspan=4, padx=5, pady=(0, 5), sticky="w")
        ctk.CTkLabel(checkbox_frame, text="Planned Training Days:").pack(side=ctk.LEFT, padx=(5,10))
        self.day_vars = []
        self.day_checkboxes = []
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i, day in enumerate(days):
            var = ctk.StringVar(value="off")
            cb = ctk.CTkCheckBox(checkbox_frame, text=day, variable=var, onvalue="on", offvalue="off")
            cb.pack(side=ctk.LEFT, padx=5, pady=0)
            self.day_vars.append(var)
            self.day_checkboxes.append(cb) # Store widget reference
        # Plan Actions
        plan_actions_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        plan_actions_frame.grid(row=2, column=0, columnspan=4, padx=5, pady=(5, 0), sticky="ew")
        plan_actions_frame.grid_columnconfigure(2, weight=1)
        self.enable_edit_button = ctk.CTkButton(plan_actions_frame, text="✏️ Edit Plan/Days", command=self.enable_plan_editing, height=28)
        self.enable_edit_button.grid(row=0, column=0, padx=(5,5), pady=5, sticky="w")
        self.save_plan_button = ctk.CTkButton(plan_actions_frame, text="💾 Save Settings & Text", command=self.save_plan_settings, height=28)
        self.save_plan_button.grid(row=0, column=1, padx=(0, 10), pady=5, sticky="w")
        self.hide_guide_var = ctk.StringVar(value="off")
        self.hide_guide_checkbox = ctk.CTkCheckBox(plan_actions_frame, text="Hide '?' Button", variable=self.hide_guide_var, onvalue="on", offvalue="off", command=self.toggle_guide_button_visibility)
        self.hide_guide_checkbox.grid(row=0, column=3, padx=(10,5), pady=5, sticky="e")
        # Encryption
        encryption_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        encryption_frame.grid(row=3, column=0, columnspan=4, padx=5, pady=(0, 5), sticky="ew")
        self.encrypt_var = ctk.StringVar(value="off")
        self.encrypt_checkbox = ctk.CTkCheckBox(encryption_frame, text="🔒 Encrypt Save File (Requires restart)", variable=self.encrypt_var, onvalue="on", offvalue="off", command=self.toggle_encryption)
        self.encrypt_checkbox.pack(side=ctk.LEFT, padx=5, pady=0)


    # --- UI Update Logic ---

    def update_ui(self):
        """
        Refreshes the state of all UI elements based on current data and state.
        (See original code for detailed comments on logic)
        """
        # Update Counters
        self.streak_label.configure(text=f"Daily Streak: {self.data.get('current_streak', 0)} 🔥")
        self.total_label.configure(text=f"Total Trainings: {self.data.get('total_trainings', 0)} 💪")

        # Update Time Display
        today_sec = self.data.get('daily_session_info', {}).get('duration_seconds', 0.0)
        total_sec = self.data.get('total_training_duration_seconds', 0.0)
        total_sess = self.data.get('total_trainings', 0)
        avg_sec = (total_sec / total_sess) if total_sess > 0 else 0.0
        # Use imported utility function for formatting
        self.today_time_label.configure(text=f"Today: {format_duration(today_sec)}")
        self.total_time_label.configure(text=f"Total: {format_duration(total_sec)}")
        self.avg_time_label.configure(text=f"Avg: {format_duration(avg_sec)}")

        # Determine State
        today_str = self.get_today().isoformat()
        trained = self.data.get('last_trained_date') == today_str
        sick = self.is_currently_sick()
        sick_until = self.data.get('sick_until_date')
        editing = self.is_plan_editing_enabled
        timer_on = self.is_timer_running
        paused = self.is_timer_paused
        default_color = ctk.ThemeManager.theme["CTkLabel"]["text_color"]

        # Update Status Label (conditionally)
        current_text = self.status_label.cget("text")
        current_color = self.status_label.cget("text_color")
        persistent = current_color in ("red", "orange", "#FF9900") or "saved" in current_text.lower() or "increased" in current_text.lower()
        if not persistent or "Error" not in current_text:
             if timer_on and not paused: self.status_label.configure(text="Training timer running...", text_color="green")
             elif paused: self.status_label.configure(text="Timer paused. Click ▶️ Resume or ⏹️ Stop & Log.", text_color="orange")
             elif trained: self.status_label.configure(text=f"Great job training today ({today_str})! Session logged.", text_color=default_color)
             elif sick:
                 end_fmt = "unknown date"
                 if sick_until:
                     try: end_fmt = date.fromisoformat(sick_until).strftime("%a, %b %d")
                     except ValueError: pass
                 self.status_label.configure(text=f"Resting until {end_fmt}. Streak preserved.", text_color="orange")
             elif editing: self.status_label.configure(text="Editing mode enabled. Modify plan/days and click 'Save'.", text_color="orange")
             else:
                planned_today = self.get_today().weekday() in self.data.get('planned_days', [])
                status_text = f"Ready to train today ({today_str}). Click 'Start'." if planned_today else f"Today ({today_str}) is a scheduled rest day."
                status_color = default_color if planned_today else "gray"
                self.status_label.configure(text=status_text, text_color=status_color)

        # Update Action Buttons
        disable_general = editing
        disable_start = disable_general or timer_on or trained or sick
        disable_sick = disable_general or timer_on or trained or sick
        # Start
        self.start_timer_button.configure(state="disabled" if disable_start else "normal")
        self.start_timer_button.grid() if not timer_on else self.start_timer_button.grid_remove()
        # Pause/Resume
        if timer_on and not disable_general:
            self.pause_resume_button.grid(); self.pause_resume_button.configure(state="normal")
            if paused: self.pause_resume_button.configure(text="▶️ Resume", fg_color="green", hover_color="darkgreen")
            else: self.pause_resume_button.configure(text="⏸️ Pause", fg_color="orange", hover_color="darkorange")
        else: self.pause_resume_button.grid_remove()
        # Stop
        if timer_on and not disable_general: self.stop_timer_button.grid(); self.stop_timer_button.configure(state="normal")
        else: self.stop_timer_button.grid_remove()
        # Sick
        self.sick_button.configure(state="disabled" if disable_sick else "normal")
        self.sick_multi_button.configure(state="disabled" if disable_sick else "normal")

        # Update Config Elements
        self.enable_edit_button.configure(state="disabled" if editing or timer_on else "normal")
        self.save_plan_button.configure(state="disabled" if not editing else "normal")
        # Day Checkboxes
        can_edit_days = editing and not timer_on
        cb_state = "normal" if can_edit_days else "disabled"
        planned = self.data.get('planned_days', [])
        for i, cb in enumerate(self.day_checkboxes):
            self.day_vars[i].set("on" if i in planned else "off")
            cb.configure(state=cb_state)
        # Guide Button
        show_guide = self.data.get('show_edit_guide_button', True)
        self.hide_guide_var.set("off" if show_guide else "on")
        self.hide_guide_checkbox.configure(state="disabled" if editing or timer_on else "normal")
        if show_guide:
            if not self.edit_guide_button.winfo_ismapped():
                 try: self.edit_guide_button.pack(side=ctk.LEFT, padx=(10, 0), pady=(0, 5))
                 except Exception as e: print(f"Error packing guide: {e}")
        else:
            if self.edit_guide_button.winfo_ismapped(): self.edit_guide_button.pack_forget()
        # Encryption Checkbox
        self.encrypt_var.set("on" if self.data.get('encrypt_save_file', False) else "off")
        self.encrypt_checkbox.configure(state="disabled" if timer_on or editing else "normal")

        # Update Plan Textbox (if not editing)
        if not editing:
            current_text = self.training_plan_textbox.get("1.0", "end-1c")
            # Use imported constant for default plan
            saved_text = self.data.get('training_plan_text', config.DEFAULT_TRAINING_PLAN)
            if current_text != saved_text:
                self.training_plan_textbox.configure(state="normal")
                self.training_plan_textbox.delete("1.0", "end")
                self.training_plan_textbox.insert("1.0", saved_text)
                self.training_plan_textbox.configure(state="disabled")

        # Reset Live Timer Display
        if not timer_on: self.live_timer_label.configure(text="Timer: 00:00:00")


    def show_streak_feedback(self):
        """Provides brief visual 'pop' animation feedback when streak increases."""
        self.streak_label.configure(text=f"Daily Streak: {self.data['current_streak']} 🔥")
        original_size = self.original_streak_font_size
        pop_size_1, pop_size_2 = original_size + 2, original_size + 4
        d1, d2, d3, d4 = 120, 120, 150, 150 # durations in ms

        try:
            self.streak_label.configure(font=ctk.CTkFont(size=pop_size_1, weight="bold"))
            self.after(d1, lambda: self.streak_label.configure(font=ctk.CTkFont(size=pop_size_2, weight="bold")))
            self.after(d1 + d2, lambda: self.streak_label.configure(font=ctk.CTkFont(size=pop_size_1, weight="bold")))
            self.after(d1 + d2 + d3, lambda: self.streak_label.configure(font=ctk.CTkFont(size=original_size, weight="bold")))

            current_color = self.status_label.cget("text_color")
            can_update = not (current_color in ("red", "orange", "#FF9900")) and not self.is_plan_editing_enabled and not self.is_timer_running
            total_anim = d1 + d2 + d3 + d4

            if can_update:
                self.status_label.configure(text=f"Streak increased to {self.data['current_streak']}! Keep it up! ✨", text_color="green")
                self.after(total_anim + 3000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
                self.after(total_anim + 3050, self.update_ui)
            else:
                 self.after(total_anim + 100, self.update_ui)

        except Exception as e:
            print(f"Error during streak animation: {e}")
            self.streak_label.configure(font=ctk.CTkFont(size=original_size, weight="bold"))
            self.update_ui()

    # --- Event Handlers ---

    # Timer Controls
    def start_timer(self):
        """Handles the 'Start Timer' button click."""
        if self.is_timer_running or self.is_plan_editing_enabled or self.is_currently_sick(): return
        if self.data.get('last_trained_date') == self.get_today().isoformat():
             self.status_label.configure(text="Already logged training for today.", text_color="orange")
             self.after(3000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
             self.after(3050, self.update_ui)
             return

        print(f"Timer started at {datetime.now(self.timezone)}")
        self.is_timer_running = True
        self.is_timer_paused = False
        self.session_start_time = datetime.now(self.timezone)
        self.paused_duration = timedelta(0)
        self.live_timer_label.configure(text="Timer: 00:00:00")
        self.update_live_timer()
        self.update_ui()

    def pause_resume_timer(self):
        """Handles the 'Pause' / 'Resume' button click."""
        if not self.is_timer_running or self.is_plan_editing_enabled: return

        if self.is_timer_paused:
            print("Timer resumed.")
            self.is_timer_paused = False
            self.session_start_time = datetime.now(self.timezone)
            self.update_live_timer()
            self.update_ui()
        else:
            print("Timer paused.")
            self.is_timer_paused = True
            if self.timer_update_job: self.after_cancel(self.timer_update_job); self.timer_update_job = None
            if self.session_start_time:
                self.paused_duration += (datetime.now(self.timezone) - self.session_start_time)
                print(f"  Paused duration accumulated: {self.paused_duration}")
            self.session_start_time = None
            self.live_timer_label.configure(text=f"Timer: {format_duration(self.paused_duration.total_seconds())} (Paused)")
            self.update_ui()

    def stop_timer(self):
        """Handles the 'Stop Timer & Log' button click."""
        if not self.is_timer_running or self.is_plan_editing_enabled: return

        print("Timer stopped.")
        if self.timer_update_job: self.after_cancel(self.timer_update_job); self.timer_update_job = None

        total_duration = self.paused_duration
        if not self.is_timer_paused and self.session_start_time:
            last_segment = datetime.now(self.timezone) - self.session_start_time
            total_duration += last_segment
            print(f"  Adding final running segment: {last_segment}")

        print(f"  Total session duration to log: {total_duration}")

        self.is_timer_running = False; self.is_timer_paused = False
        self.session_start_time = None; self.paused_duration = timedelta(0)

        self.log_training_completion(total_duration.total_seconds())
        self.live_timer_label.configure(text="Timer: 00:00:00")
        self.update_ui()

    # Sick Day Controls
    def mark_as_sick(self):
        """Handles the 'Mark as Sick (Today)' button click."""
        if self.is_timer_running or self.is_plan_editing_enabled or self.is_currently_sick(): return
        if self.data.get('last_trained_date') == self.get_today().isoformat(): return

        today = self.get_today(); today_str = today.isoformat()
        self.data['sick_until_date'] = today_str
        self.data['last_active_date'] = today_str
        self.save_data(); self.update_ui()
        print(f"Marked as sick for today ({today_str}).")
        self.status_label.configure(text=f"Marked as resting today ({today.strftime('%a, %b %d')}).", text_color="orange")

    def mark_sick_multiple_days(self):
        """Handles the 'Mark Sick (Multi-Day)' button click, opens input dialog."""
        if self.is_timer_running or self.is_plan_editing_enabled or self.is_currently_sick(): return
        if self.data.get('last_trained_date') == self.get_today().isoformat(): return

        dialog = CTkInputDialog(text="Enter number of days to mark as sick/resting (including today):", title="Mark Sick Period")
        input_days_str = dialog.get_input()
        if input_days_str is None: return

        try:
            num_days = int(input_days_str)
            if num_days <= 0: raise ValueError("Must be positive.")
        except ValueError:
            self.status_label.configure(text="Invalid input. Please enter a positive whole number.", text_color="orange")
            self.after(4000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
            self.after(4050, self.update_ui)
            return

        today = self.get_today()
        end_date = today + timedelta(days=num_days - 1)
        end_date_str = end_date.isoformat()
        self.data['sick_until_date'] = end_date_str
        self.data['last_active_date'] = today.isoformat()
        self.save_data(); self.update_ui()
        print(f"Marked as sick for {num_days} days, until {end_date_str}.")
        self.status_label.configure(text=f"Marked as resting until {end_date.strftime('%a, %b %d')}. Streak preserved.", text_color="orange")

    # Plan Editing Controls
    def enable_plan_editing(self):
         """Enables editing for the training plan textbox and day checkboxes."""
         if self.is_timer_running:
             self.status_label.configure(text="Stop the timer before editing the plan/days.", text_color="orange")
             self.after(3000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
             self.after(3050, self.update_ui)
             return
         self.training_plan_textbox.configure(state="normal")
         self.is_plan_editing_enabled = True
         self.status_label.configure(text="Editing mode enabled. Modify plan/days and click 'Save'.", text_color="orange")
         self.training_plan_textbox.focus()
         self.update_ui()
         print("Plan/Days editing enabled.")

    def save_plan_settings(self):
        """Saves selected days and plan text. Disables editing mode."""
        if not self.is_plan_editing_enabled: return

        new_days = [i for i, var in enumerate(self.day_vars) if var.get() == "on"]
        new_text = self.training_plan_textbox.get("1.0", "end-1c")
        days_changed = set(self.data.get('planned_days', [])) != set(new_days)
        text_changed = self.data.get('training_plan_text', '') != new_text
        changed = days_changed or text_changed

        if days_changed: self.data['planned_days'] = new_days; print(f"Planned days updated.")
        if text_changed: self.data['training_plan_text'] = new_text; print("Plan text updated.")

        self.training_plan_textbox.configure(state="disabled")
        self.is_plan_editing_enabled = False

        if changed:
            self.save_data()
            self.status_label.configure(text="Training plan settings and text saved!", text_color="green")
            clear_after = 4000
        else:
            self.status_label.configure(text="No changes detected in plan settings or text.", text_color="gray")
            clear_after = 3000

        self.after(clear_after, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
        self.after(clear_after + 50, self.update_ui)
        self.update_ui() # Update immediately except for status clear

    # Configuration Controls
    def toggle_encryption(self):
        """Handles toggling the 'Encrypt Save File' checkbox."""
        if self.is_timer_running or self.is_plan_editing_enabled:
            self.status_label.configure(text="Cannot change encryption while timer running or plan editing.", text_color="orange")
            self.encrypt_var.set("on" if self.data.get('encrypt_save_file', False) else "off")
            self.after(3000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
            self.after(3050, self.update_ui)
            return

        current = self.data.get('encrypt_save_file', False)
        wants_on = self.encrypt_var.get() == "on"
        if current == wants_on: return

        action = "Enabling" if wants_on else "Disabling"
        print(f"{action} encryption...")
        status_text, status_color = "", "green"

        if wants_on:
            if not self.encryption_key and not self._load_key() and not self._generate_and_save_key():
                 self.encrypt_var.set("off"); status_text, status_color = "Failed: Key error.", "red"
            elif self.encryption_key:
                 self.data['encrypt_save_file'] = True; status_text = "Encryption enabled. Saving encrypted..."
            else: # Should not happen
                 self.encrypt_var.set("off"); status_text, status_color = "Failed: Key unavailable.", "red"
        else:
            self.data['encrypt_save_file'] = False; status_text = "Encryption disabled. Saving unencrypted..."

        self.status_label.configure(text=status_text, text_color=status_color)
        if status_color == "green": self.save_data() # Save only if successful toggle

        clear_after = 4000 if status_color == "green" else 3000
        self.after(clear_after, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
        self.after(clear_after + 50, self.update_ui)


    def toggle_guide_button_visibility(self):
        """Handles toggling the 'Hide '?' Button' checkbox."""
        if self.is_timer_running or self.is_plan_editing_enabled:
            self.status_label.configure(text="Cannot change this setting now.", text_color="orange")
            self.hide_guide_var.set("off" if self.data.get('show_edit_guide_button', True) else "on")
            self.after(3000, lambda: self.status_label.configure(text="", text_color=ctk.ThemeManager.theme["CTkLabel"]["text_color"]))
            self.after(3050, self.update_ui)
            return

        show = self.hide_guide_var.get() == "off"
        self.data['show_edit_guide_button'] = show
        self.save_data(); self.update_ui()
        print(f"'How to Edit' guide button visibility set to: {'shown' if show else 'hidden'}")

    # Guide Popup
    def show_edit_guide(self):
        """Displays a pop-up window explaining how to edit the training plan."""
        if hasattr(self, 'guide_popup') and self.guide_popup.winfo_exists():
            self.guide_popup.lift(); self.guide_popup.focus(); return

        self.guide_popup = ctk.CTkToplevel(self)
        self.guide_popup.title("How to Edit Training Plan")
        self.guide_popup.geometry("450x250")
        self.guide_popup.transient(self); self.guide_popup.attributes("-topmost", True)
        self.guide_popup.grab_set()
        self.guide_popup.protocol("WM_DELETE_WINDOW", self.guide_popup.destroy)

        guide_text = """
How to Edit Your Training Plan & Days:

1. Ensure the Training Timer is **STOPPED**.
   (You cannot edit while the timer is running).

2. Click the **'✏️ Edit Plan/Days'** button.

3. Make desired changes in the text box and/or
   select/deselect planned training days using
   the **Mon-Sun checkboxes**.

4. Click the **'💾 Save Settings & Text'**
   button to save all changes.

5. Editing mode will be automatically disabled.
"""
        ctk.CTkLabel(self.guide_popup, text=guide_text.strip(), justify=ctk.LEFT, font=ctk.CTkFont(size=12), anchor="w").pack(padx=20, pady=(20, 10), fill="both", expand=True)
        ctk.CTkButton(self.guide_popup, text="OK", command=self.guide_popup.destroy, width=80).pack(padx=20, pady=(0, 15))

        self.guide_popup.update_idletasks()
        mw_x, mw_y, mw_w, mw_h = self.winfo_x(), self.winfo_y(), self.winfo_width(), self.winfo_height()
        pw, ph = self.guide_popup.winfo_width(), self.guide_popup.winfo_height()
        x = mw_x + (mw_w // 2) - (pw // 2); y = mw_y + (mw_h // 2) - (ph // 2)
        self.guide_popup.geometry(f"+{x}+{y}")
        self.guide_popup.focus()

    # --- Timer Internals ---

    def update_live_timer(self):
        """Updates the live timer label every second while timer is running and not paused."""
        if not self.is_timer_running or self.is_timer_paused:
            if self.timer_update_job:
                try: self.after_cancel(self.timer_update_job)
                except ValueError: pass
                self.timer_update_job = None
            return

        display_duration = self.paused_duration
        if self.session_start_time:
            display_duration += (datetime.now(self.timezone) - self.session_start_time)

        self.live_timer_label.configure(text=f"Timer: {format_duration(display_duration.total_seconds())}")

        if self.winfo_exists():
            self.timer_update_job = self.after(1000, self.update_live_timer)

    # --- Scheduled Tasks ---

    def schedule_daily_check(self):
        """
        Calculates time until 1 minute past next midnight and schedules
        'run_scheduled_check'. Cancels any existing scheduled check.
        """
        now = datetime.now(self.timezone)
        midnight_today = self.timezone.localize(datetime.combine(now.date(), datetime.min.time()))
        midnight_tomorrow = midnight_today + timedelta(days=1)
        target_time = midnight_tomorrow + timedelta(minutes=1)
        delta_s = (target_time - now).total_seconds()

        if delta_s < 60: delta_s = 60; target_time = now + timedelta(seconds=60)

        print(f"Scheduling next daily check in {delta_s:.0f}s (at {target_time:%Y-%m-%d %H:%M:%S %Z}).")

        if self._scheduled_check_timer_id:
            try: self.after_cancel(self._scheduled_check_timer_id); print("Cancelled previous daily check.")
            except ValueError: print("Warn: Could not cancel previous daily check timer.")
            self._scheduled_check_timer_id = None

        if self.winfo_exists():
             self._scheduled_check_timer_id = self.after(int(delta_s * 1000), self.run_scheduled_check)

    def run_scheduled_check(self):
        """
        Method executed by the scheduled 'after' job.
        Performs daily checks and reschedules itself for the next day.
        """
        print(f"Running scheduled daily check... ({datetime.now(self.timezone)})")
        self.check_daily_reset_and_streak()
        self.update_ui()
        self._scheduled_check_timer_id = None
        self.schedule_daily_check() # Reschedule

# --- Main Execution Block ---
if __name__ == "__main__":
    # Create and run the application instance
    app = VoiceTrackerApp()
    app.mainloop()