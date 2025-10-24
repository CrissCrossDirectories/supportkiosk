# iPad Kiosk Deployment Checklist

## Pre-Deployment Testing

### 1. Local Testing (macOS/Browser)
```bash
cd /Users/terryutley/Projects/TechPortal/SupportKiosk/kiosk-app
npm start
```
- Navigate to `http://localhost:3000`
- Test all three kiosk flows:
  - ✅ Check In (camera + speech + problem description)
  - ✅ Leave Message (speech recording)
  - ✅ Damage Waiver (speech recording + form submission)

### 2. iPad Safari Testing (Same Network)
Find your Mac's local IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for something like 192.168.x.x
```

On iPad:
1. Open Safari on iPad connected to same WiFi as your Mac
2. Navigate to `http://[YOUR_MAC_IP]:3000`
3. Test all flows with actual camera (rear and front)
4. Test microphone recording
5. Test speech recognition

### 3. Production Testing (HTTPS)
1. Build the production bundle:
```bash
cd /Users/terryutley/Projects/TechPortal/SupportKiosk/kiosk-app
npm run build
```

2. Deploy build to your production server
3. Test on iPad with HTTPS URL
4. Verify all Firebase calls work
5. Verify Google Drive upload works

---

## iPad Setup Procedure

### Step 1: Initial WiFi Configuration
1. **iPad Settings:**
   - Settings > WiFi > Select your kiosk WiFi network
   - Ensure "Auto-Join" is enabled
   - If WiFi requires login, complete authentication

2. **Test Connection:**
   - Open Settings > About > Wi-Fi
   - Confirm IP address is assigned
   - Return to home screen

### Step 2: Browser Permissions Setup
1. **Open Safari:**
   - Tap Safari icon
   - Navigate to your kiosk URL (HTTPS required)

2. **First Time Access:**
   - iOS will prompt for camera permission → **Tap "Allow"**
   - iOS will prompt for microphone permission → **Tap "Allow"**
   - If prompted for location, **Tap "Allow"**

3. **Verify Permissions:**
   - Settings > Safari > [Your Kiosk URL or Domain]
   - ✅ Camera: Allow
   - ✅ Microphone: Allow

### Step 3: Create Home Screen App
1. In Safari, tap the **Share** button (⬆️ in box)
2. Scroll down and select **"Add to Home Screen"**
3. Set name to: `Tech Support Kiosk`
4. Tap **"Add"**
5. New icon now appears on iPad home screen

### Step 4: Enable Guided Access (Kiosk Lock)

#### On iPad with Home Button (iPad Air 2, iPad 5th gen, etc.):
1. Settings > Accessibility > Guided Access > **Turn On**
2. Tap **Set Up Screen Time Passcode** (or use existing)
3. Enter 4-digit passcode (e.g., `1234`)
4. Confirm passcode
5. Tap **"Accessibility Shortcuts"** > Toggle **Guided Access**
6. Now triple-click home button activates Guided Access

#### On iPad with Side Button (iPad Pro, iPad Air 4+, iPad Mini 5+):
1. Settings > Accessibility > Guided Access > **Turn On**
2. Tap **Set Up Screen Time Passcode** (or use existing)
3. Enter 4-digit passcode
4. Confirm passcode
5. Tap **"Accessibility Shortcuts"** > Toggle **Guided Access**
6. Now triple-click side button activates Guided Access

### Step 5: Launch App in Kiosk Mode
1. Tap **Tech Support Kiosk** icon on home screen
2. Wait for app to fully load
3. **Triple-click Home/Side Button** (wherever it is for your iPad model)
4. Select **"Guided Access"** from menu options
5. You should see checkmarks on any areas you want to disable (usually skip this)
6. Tap **"Start"** in upper right
7. Enter your passcode
8. **iPad is now locked in Kiosk Mode** ✅

### Step 6: Test Kiosk Features
- Try closing app with home button → Should not work (passcode protected)
- Try swiping from edges → Should not work
- Try accessing app switcher → Should not work
- Tap buttons in app → Should work normally
- Camera → Should work normally
- Microphone → Should work normally

---

## During Operation

### Normal Usage:
- Users interact with kiosk normally
- iPad stays in Guided Access mode
- Home button and gestures are disabled
- Only way to exit is to triple-tap home/side button and enter passcode

### If You Need to Exit:
1. **Triple-click Home or Side Button** (depending on iPad model)
2. Tap **"End Guided Access"**
3. Enter your passcode
4. iPad returns to normal mode

### Maintenance:
- Charge iPad overnight (stays in Guided Access while charging)
- Monitor WiFi connection status
- Restart app if camera/mic stops working
- Check logs in Firebase console for errors

---

## Troubleshooting During Deployment

### Issue: App Won't Load
**Check:**
- WiFi connection is stable
- HTTPS URL is correct
- Firebase is accessible
- No firewall blocking the domain

### Issue: Camera Permission Keep Getting Requested
**Fix:**
- Settings > Safari > [Your Domain] > Camera > Ensure "Allow" is selected
- If grayed out, clear Safari data and re-grant permission

### Issue: Can't Exit Guided Access
**Fix:**
- Triple-click home/side button (make sure you're clicking the right button)
- If button doesn't respond, force restart iPad:
  - iPad with home button: Press home + top button simultaneously
  - iPad Pro: Press top button + volume up simultaneously
  - Then hold until slide to power off appears

### Issue: App Crashes in Guided Access
**Fix:**
- Exit Guided Access (triple-click + passcode)
- Clear Safari cache: Settings > Safari > Clear History and Website Data
- Close and reopen Safari
- Re-enter Guided Access

### Issue: Microphone Muted
**Check:**
- Look for **red dot** near iPad front camera (hardware mute switch)
- If present and visible (red), mute switch is ON
- Toggle mute switch off (rotate toward speaker)
- The dot should disappear

---

## Post-Deployment Monitoring

### Daily Checks:
```
☐ WiFi connection active
☐ App loads without errors
☐ Camera initializes properly
☐ Microphone records audio
☐ Speech recognition works
☐ Firebase uploads completed
☐ No stuck sessions
```

### Weekly Maintenance:
```
☐ Check app error logs in Firebase Console
☐ Review ticket uploads for completeness
☐ Verify audio files uploading to Google Drive
☐ Check iPad storage usage
☐ Restart iPad at least once per week
☐ Review network connectivity stats
```

### Monthly Review:
```
☐ Analyze usage patterns
☐ Review failed transactions
☐ Update any configuration needed
☐ Test manual recovery procedures
☐ Document any new issues
```

---

## Emergency Recovery

### If iPad is Stuck:

**Option 1: Force Quit App (Still in Guided Access)**
1. Cannot use home button
2. Must triple-click home + enter passcode
3. Then close Safari and restart

**Option 2: Force Restart iPad**
- iPad with Home Button: Hold home + top button until "slide to power off"
- iPad Pro: Hold side button + volume up until emergency screen appears
- Then restart normally

**Option 3: Complete Reset (Last Resort)**
- Setting > General > Reset > Reset All Settings
- This wipes all settings but keeps data
- Requires full reconfiguration

---

## Security Notes

### Passcode Security:
- Use a passcode that **staff knows but isn't obvious**
- Change passcode monthly
- Don't share passcode with students
- Write it down and store securely (not on the iPad)

### WiFi Security:
- Use enterprise WiFi with WPA3 if possible
- Consider separate WiFi network for kiosks
- Monitor connected devices

### Data Privacy:
- Audio/video uploads go to Google Drive (secured by school account)
- Firestore database is read/write controlled by Firebase rules
- Review Firebase security rules regularly

---

## Support Resources

### When to Call IT:
- WiFi keeps disconnecting
- iPad hardware issues (camera/mic not working)
- Passcode locked out (factory reset might be needed)

### Developer Support:
- Check Firebase Console for error logs
- Review browser console (Safari Developer Tools)
- Check Google Drive for upload success/failure

---

## Quick Reference Commands

**If you need to rebuild and redeploy:**
```bash
# Build production bundle
cd /Users/terryutley/Projects/TechPortal/SupportKiosk/kiosk-app
npm run build

# Deploy build/ folder to web server
# Configure Firebase functions for file storage
# Test on HTTPS URL
```

**If you need to check logs:**
- Firebase Console: https://console.firebase.google.com/
- Google Drive: https://drive.google.com (check uploads folder)
- Safari Web Inspector: Develop > [Device] > [Page]
