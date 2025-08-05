; Real Remote Desktop Agent Installer
; NSIS Script for Windows Deployment

!define PRODUCT_NAME "Real Remote Desktop Agent"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Real Remote Desktop Team"
!define PRODUCT_WEB_SITE "https://github.com/real-remote-desktop"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\real-remote-desktop-agent.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

SetCompressor lzma

; MUI 1.67 compatible ------
!include "MUI.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; License page
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\real-remote-desktop-agent.exe"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "English"

; MUI end ------

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "real-remote-desktop-agent-setup.exe"
InstallDir "$PROGRAMFILES\Real Remote Desktop Agent"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; Main executable
  File "real-remote-desktop-agent.exe"
  
  ; Configuration files
  File "config.toml"
  File "LICENSE.txt"
  File "README.md"
  
  ; Create directories
  CreateDirectory "$SMPROGRAMS\Real Remote Desktop Agent"
  CreateDirectory "$INSTDIR\logs"
  CreateDirectory "$INSTDIR\data"
  
  ; Create shortcuts
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop Agent\Real Remote Desktop Agent.lnk" "$INSTDIR\real-remote-desktop-agent.exe"
  CreateShortCut "$DESKTOP\Real Remote Desktop Agent.lnk" "$INSTDIR\real-remote-desktop-agent.exe"
  
  ; Install as Windows service
  ExecWait '"$INSTDIR\real-remote-desktop-agent.exe" --install-service'
SectionEnd

Section -AdditionalIcons
  WriteIniStr "$INSTDIR\${PRODUCT_NAME}.url" "InternetShortcut" "URL" "${PRODUCT_WEB_SITE}"
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop Agent\Website.lnk" "$INSTDIR\${PRODUCT_NAME}.url"
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop Agent\Uninstall.lnk" "$INSTDIR\uninst.exe"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

; Uninstaller
Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  ; Stop and remove Windows service
  ExecWait '"$INSTDIR\real-remote-desktop-agent.exe" --uninstall-service'
  
  ; Remove files
  Delete "$INSTDIR\${PRODUCT_NAME}.url"
  Delete "$INSTDIR\uninst.exe"
  Delete "$INSTDIR\real-remote-desktop-agent.exe"
  Delete "$INSTDIR\config.toml"
  Delete "$INSTDIR\LICENSE.txt"
  Delete "$INSTDIR\README.md"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Real Remote Desktop Agent\Uninstall.lnk"
  Delete "$SMPROGRAMS\Real Remote Desktop Agent\Website.lnk"
  Delete "$SMPROGRAMS\Real Remote Desktop Agent\Real Remote Desktop Agent.lnk"
  Delete "$DESKTOP\Real Remote Desktop Agent.lnk"
  
  ; Remove directories
  RMDir "$SMPROGRAMS\Real Remote Desktop Agent"
  RMDir "$INSTDIR\logs"
  RMDir "$INSTDIR\data"
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd 