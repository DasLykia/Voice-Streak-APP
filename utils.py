# -*- coding: utf-8 -*-
"""
Utility functions for the Voice Training Tracker application.
"""

# --- Helper Function for Formatting Time ---
def format_duration(total_seconds):
    """Formats a duration in seconds into HH:MM:SS string."""
    if total_seconds is None or total_seconds < 0:
        return "00:00:00"
    total_seconds = int(total_seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:02}"

# Add other potential utility functions here in the future