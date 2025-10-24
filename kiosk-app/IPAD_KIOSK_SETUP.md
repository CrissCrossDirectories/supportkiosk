# iPad Kiosk Mode Setup & Troubleshooting Guide

## Summary of Changes Made

This guide documents the optimizations applied to the Tech Support Kiosk app for iPad Guided Access mode.

---

## 1. **Manifest & HTML Updates**

### Changes to `public/index.html`:
- ✅ Added `apple-mobile-web-app-capable` meta tag for iOS standalone mode
- ✅ Set `apple-mobile-web-app-status-bar-style` to `black-translucent` to hide Safari UI
- ✅ Updated viewport to prevent zoom and set `viewport-fit=cover` for notch support
- ✅ Added `format-detection="telephone=no"` to prevent accidental phone dialing

### Changes to `public/manifest.json`:
- ✅ Changed `display` from `standalone` to `fullscreen` (kiosk mode)
- ✅ Set `orientation` to `landscape` (iPad standard for kiosks)
- ✅ Updated app name and description for clarity

### Changes to `src/index.css`:
- ✅ Added styles to prevent pinch-to-zoom
- ✅ Disabled text selection except in input fields
- ✅ Prevented scroll bounce and accidental gestures
- ✅ Fixed body positioning to prevent UI shifts

---

## 2. **Camera/Scanner Fixes**

### Issues Resolved:
1. **Wrong Camera Selected**: Changed from `facingMode: "user"` (front camera) to `facingMode: { ideal: "environment" }` (rear camera)
   - Barcode/QR code scanning works much better with rear camera
   - iPad camera positioning favors rear camera for proper scanning angle

2. **Better Error Handling**: Added user-friendly error messages for:
   - Camera permission denied
   - Camera in use by another app
   - Camera not found
   - NotReadableError

### File: `kiosk-app/src/App.js` - `UserVerification.startScanner()` function
**Location**: Line ~808
**Change**: Updated camera constraints and improved error messages

---

## 3. **Microphone/Audio Fixes**

### Issues Resolved:
1. **Better Error Handling**: Added user-friendly messages for microphone permission issues
2. **Improved Audio Constraints**: Added `autoGainControl: true` for better audio levels on iPad
3. **Consistent Across All Flows**: Updated microphone initialization in:
   - `CheckInFlow` (line ~1360)
   - `DamageWaiverFlow` (line ~484)
   - `LeaveMessageFlow` (line ~1614)

### Audio Constraints Now Include:
```javascript
{
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true  // iPad benefit
}
```

---

## 4. **iPad Guided Access Configuration**

### How to Set Up Guided Access on iPad:

1. **Enable Guided Access:**
   - Settings > Accessibility > Guided Access > Turn On
   - Set a passcode (prevents unauthorized exit)

2. **Launch the App:**
   - Open Safari and navigate to your kiosk URL
   - Add to Home Screen: Share > Add to Home Screen
   - Name it "Tech Support Kiosk"

3. **Start Guided Access:**
   - Triple-tap the home button (or side button for newer iPads)
   - Select "Guided Access" from options
   - Encircle any areas to disable (optional - usually skip this)
   - Tap "Start" and enter passcode
   - iPad is now in locked kiosk mode

4. **To Exit:** Triple-tap home/side button again, enter passcode

### What Guided Access Locks:
- Home button
- App switcher (multitasking)
- System gestures (swiping from edges)
- Accidental app closure

### What Still Works:
- Camera (if enabled in app)
- Microphone (if enabled in app)
- Touch interactions within the app
- Speech recognition
- Network/WiFi

---

## 5. **Permission Management**

### Required Permissions for iPad:
Your kiosk needs the following permissions enabled:

1. **Camera Permission:**
   - Settings > Safari > Tech Support Kiosk > Camera
   - Set to "Allow"

2. **Microphone Permission:**
   - Settings > Safari > Tech Support Kiosk > Microphone
   - Set to "Allow"

3. **Web Socket Access:**
   - Ensure your Firebase endpoint is in HTTPS (required for PWA)

### Permission Request Flow:
- First time the app requests camera, iOS will prompt the user
- Same for microphone
- User can grant/deny permanently
- To reset permissions: Settings > Safari > Clear History and Website Data

---

## 6. **Testing Checklist**

### Before Deployment:
- [ ] **Camera Scanning:**
  - Test QR code scanning with valid ID badges
  - Verify rear camera is being used (app shows mirrored view with `transform: scaleX(-1)`)
  - Test barcode scanning in good lighting and low lighting

- [ ] **Microphone Recording:**
  - Test "Hold to Speak" button in all three flows
  - Verify audio is being captured and uploaded
  - Check microphone in Settings > Safari > Audio is "Allow"

- [ ] **Speech Recognition:**
  - Test voice commands in Check-in flow
  - Verify interim and final transcripts display correctly
  - Test in noisy and quiet environments

- [ ] **Guided Access:**
  - Enable Guided Access and verify exit is passcode-protected
  - Confirm app cannot be exited with home button
  - Test all app functionality within Guided Access

- [ ] **Network:**
  - Test with WiFi only (no cellular needed for kiosk)
  - Verify Firebase calls work
  - Test audio upload to Google Drive

- [ ] **Error States:**
  - Deny camera permission and verify error message
  - Deny microphone permission and verify error message
  - Disconnect WiFi and verify graceful failure

---

## 7. **Troubleshooting**

### Camera Not Initializing:
**Symptoms:** Black screen in camera, "Could not access camera" error

**Solutions:**
1. Check Settings > Safari > Tech Support Kiosk > Camera is "Allow"
2. Close and restart Safari app
3. Restart iPad
4. If another app is using camera, close it first

### Microphone Not Working:
**Symptoms:** Mic button shows listening but no audio captured, upload fails

**Solutions:**
1. Check Settings > Safari > Tech Support Kiosk > Microphone is "Allow"
2. Verify microphone isn't muted (check hardware mute switch on iPad)
3. Test microphone with voice memo app first
4. Restart Safari

### Barcode Scanning Not Working:
**Symptoms:** Barcode scanned but not recognized, or nothing happens when scanned

**Solutions:**
1. Ensure badge is NOT upside down
2. Test under good lighting (not too dark or bright)
3. Make sure rear camera is being used (should see normal/non-mirrored video)
4. Verify barcode is CODE_128 format (most school IDs are)
5. Check console for errors (use Safari Web Inspector)

### Speech Recognition Fails:
**Symptoms:** "Speech recognition not supported" error, or recognition doesn't start

**Solutions:**
1. Requires HTTPS connection (HTTP won't work on iOS)
2. Check internet connection is stable
3. Try in quiet environment (reduce background noise)
4. Restart Safari

### App Closes Unexpectedly:
**Symptoms:** App crashes or goes back to home screen

**Solutions:**
1. Check browser console for JavaScript errors (Safari Web Inspector)
2. Clear Safari cache: Settings > Safari > Clear History and Website Data
3. Update iOS to latest version
4. Reinstall web app (remove from home screen and re-add)

---

## 8. **Performance Optimization Tips**

### For Best Performance on iPad:
1. **Close Background Apps:** Frees up RAM for camera/audio processing
2. **Disable Auto-Lock:** Settings > Display & Brightness > Auto-Lock > Never (while in Guided Access)
3. **Use 5GHz WiFi if Available:** Better for streaming audio uploads
4. **Enable Low Power Mode if Battery is Concern:** Settings > Battery
5. **Keep iPad Cool:** Don't cover vents; poor thermals can throttle processing

---

## 9. **References**

### Apple Documentation:
- [Guided Access Documentation](https://support.apple.com/guide/ipad/get-started-with-guided-access-ipad02c2e7c/ipados)
- [Web App Configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

### Camera/Audio APIs:
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### HTML5 QR Code Library:
- [html5-qrcode Documentation](https://github.com/mebjas/html5-qrcode)

---

## 10. **Known Limitations**

1. **Safari Only:** Kiosk only works in Safari browser on iPad (not Chrome, Firefox, etc.)
2. **HTTPS Required:** PWA features require HTTPS connection
3. **Guided Access Requires Passcode:** Need to set passcode for security
4. **No Direct App Installation:** Must use Safari web app, not native app
5. **iOS Version Dependent:** Features may vary on iOS 13 vs iOS 17

---

## Questions or Issues?

If you encounter issues not covered here:
1. Check browser console: Safari > Develop > [device] > [app] > Console
2. Enable verbose logging in html5-qrcode
3. Capture screenshots of error messages
4. Test on different iPads to isolate device-specific issues
