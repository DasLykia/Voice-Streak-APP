!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to remove ALL VoiceStride data (settings, history, updates)?" \
    IDNO skipDelete

  ; Main app data (electron-store)
  RMDir /r "$APPDATA\voicestride"

  ; Auto-updater cache
  RMDir /r "$LOCALAPPDATA\voicestride-updater"

  skipDelete:
!macroend
