# -*- coding: utf-8 -*-
"""
Configuration constants for the Voice Training Tracker application.
"""

# --- Application Constants ---
DATA_FILE = "voice_tracker_data.json"       # Name of the file storing user data
KEY_FILE = "tracker_key.key"              # Name of the file storing the encryption key
TIMEZONE_STR = 'Europe/Vienna'            # Timezone identifier string
APP_NAME = "Voice Training Tracker"         # Display name of the application
WINDOW_GEOMETRY = "1000x950"              # Initial size of the application window

# Default training plan text if none is saved
DEFAULT_TRAINING_PLAN = """
(Default Plan)
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