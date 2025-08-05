; Real Remote Desktop Agent Installer
; NSIS Script for Windows Installation

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
!insertmacro MUI_PAGE_LICENSE "LICENSE"
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\real-remote-desktop-agent.exe"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "English"

; MUI end ------

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "RealRemoteDesktopAgent-Setup.exe"
InstallDir "$PROGRAMFILES\Real Remote Desktop"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; Main executable
  File "..\agent\target\release\real-remote-desktop-agent.exe"
  
  ; Configuration files
  File "..\agent\config.toml"
  File "..\agent\README.md"
  File "LICENSE"
  
  ; Create logs directory
  CreateDirectory "$INSTDIR\logs"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninst.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\Real Remote Desktop"
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop\Real Remote Desktop Agent.lnk" "$INSTDIR\real-remote-desktop-agent.exe"
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop\Uninstall.lnk" "$INSTDIR\uninst.exe"
  
  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\Real Remote Desktop Agent.lnk" "$INSTDIR\real-remote-desktop-agent.exe"
SectionEnd

Section "Windows Service" SEC02
  ; Install as Windows service
  ExecWait 'sc.exe create "RealRemoteDesktopAgent" binPath= "$INSTDIR\real-remote-desktop-agent.exe --service" DisplayName= "Real Remote Desktop Agent" start= auto'
  ExecWait 'sc.exe description "RealRemoteDesktopAgent" "Native agent for Real Remote Desktop platform"'
  ExecWait 'sc.exe start "RealRemoteDesktopAgent"'
SectionEnd

Section "Firewall Rules" SEC03
  ; Add firewall rules
  ExecWait 'netsh advfirewall firewall add rule name="Real Remote Desktop Agent TCP" dir=in action=allow protocol=TCP localport=8080'
  ExecWait 'netsh advfirewall firewall add rule name="Real Remote Desktop Agent UDP" dir=in action=allow protocol=UDP localport=8080'
SectionEnd

Section -AdditionalIcons
  WriteIniStr "$INSTDIR\${PRODUCT_NAME}.url" "InternetShortcut" "URL" "${PRODUCT_WEB_SITE}"
  CreateShortCut "$SMPROGRAMS\Real Remote Desktop\Website.lnk" "$INSTDIR\${PRODUCT_NAME}.url"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\real-remote-desktop-agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
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
  ; Stop and remove service
  ExecWait 'sc.exe stop "RealRemoteDesktopAgent"'
  ExecWait 'sc.exe delete "RealRemoteDesktopAgent"'
  
  ; Remove firewall rules
  ExecWait 'netsh advfirewall firewall delete rule name="Real Remote Desktop Agent TCP"'
  ExecWait 'netsh advfirewall firewall delete rule name="Real Remote Desktop Agent UDP"'
  
  ; Remove files
  Delete "$INSTDIR\${PRODUCT_NAME}.url"
  Delete "$INSTDIR\uninst.exe"
  Delete "$INSTDIR\real-remote-desktop-agent.exe"
  Delete "$INSTDIR\config.toml"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\LICENSE"
  
  ; Remove directories
  RMDir "$SMPROGRAMS\Real Remote Desktop"
  RMDir "$INSTDIR\logs"
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  
  ; Remove shortcuts
  Delete "$DESKTOP\Real Remote Desktop Agent.lnk"
  
  SetAutoClose true
SectionEnd 