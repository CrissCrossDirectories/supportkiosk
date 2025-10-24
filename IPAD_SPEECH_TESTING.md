# iPad Speech Recognition Testing Guide

## Quick Test (5 minutes)

### Setup
1. Open iPad and connect to Wi-Fi
2. Open Safari and navigate to: https://supportkiosk-b43dd.web.app
3. Log in with your test account
4. Navigate to a flow that uses "Hold to Speak" (e.g., Damage Waiver → Audio Description)

### Desktop Test (Baseline)
1. On a laptop/desktop with Chrome/Safari:
   - Press and hold "Hold to Speak" button
   - Button should turn **RED**
   - Live transcription should appear immediately as you speak
   - Release button
   - Transcript should be processed

**Expected Result**: Live red button + immediate text display

### iPad Test (New Feature)
1. On iPad with iOS 17.8:
   - Ensure microphone is enabled in Settings → Safari → Tech Support Kiosk
   - Press and hold "Hold to Speak" button
   - Button should turn **RED**
   - Message should show: "🎤 Recording... Please speak clearly. We'll transcribe your audio on our server."
   - Speak clearly for 3-5 seconds
   - Release button
   - Message should change to: "Transcribing audio..." (processing)
   - After 2-5 seconds, transcript should appear
   - Continue with the flow

**Expected Result**: Red button + server-side transcription after release

## Detailed Test Checklist

### Microphone Permission (First Time)
- [ ] iPad prompts: "Allow 'Safari' to access your microphone?"
- [ ] Select "Allow"
- [ ] Proceed with Hold to Speak test

### Audio Capture on iPad
- [ ] Hold to Speak button shows RED indicator
- [ ] Interim text updates to: "🎤 Recording... Please speak clearly. We'll transcribe your audio on our server."
- [ ] Button remains RED while holding
- [ ] No errors in console (Cmd+Option+J on desktop Safari connected to iPad)

### Transcription Processing
- [ ] After releasing button, shows "Transcribing audio..."
- [ ] Waits 2-5 seconds (network + processing time)
- [ ] Transcript appears in interim text display
- [ ] Audio and transcript are logged in the waiver submission

### Successful Flow Completion
- [ ] Transcript is sent to AI summarization function
- [ ] Summary appears (e.g., "Device needs screen replacement")
- [ ] Waiver submission completes normally
- [ ] No error messages in console or UI

## Edge Cases to Test

### 1. Very Quiet Audio
**Action**: Whisper into microphone while holding button
**Expected**: Transcription should still work (or show empty transcript)
**Actual**: _______________

### 2. Very Loud Audio
**Action**: Shout or create noise while holding button
**Expected**: Transcription should work (with possible muting/clipping)
**Actual**: _______________

### 3. Background Noise
**Action**: Play music or crowd noise in background while speaking
**Expected**: Transcription should still capture main voice
**Actual**: _______________

### 4. Long Audio (> 5 minutes)
**Action**: Hold button and speak continuously for 5+ minutes
**Expected**: Should eventually timeout or show error
**Actual**: _______________

### 5. Network Disconnect
**Action**: Turn off Wi-Fi after releasing button but before transcription returns
**Expected**: Error message or fallback behavior
**Actual**: _______________

### 6. Multiple Quick Attempts
**Action**: Hold button, speak, release. Immediately repeat 3 times.
**Expected**: All transcriptions should succeed or queue properly
**Actual**: _______________

## Comparing Desktop vs iPad

| Feature | Desktop Browser | iPad Safari |
|---------|-----------------|-------------|
| Button turns RED | ✅ Yes | ✅ Yes |
| Interim text updates | ✅ Live/realtime | ✅ After release |
| Transcription source | Browser API | Cloud Speech-to-Text |
| Latency | <100ms | 2-5 seconds |
| Works offline | ✅ Yes | ❌ No (needs internet) |
| Automatic text display | ✅ Yes | ✅ Yes (after processing) |

## Console Debugging (iPad)

1. On desktop, open Safari → Develop → [iPad Name] → Safari
2. Open Console tab
3. Look for:
   - `"Calling Google Cloud Speech-to-Text API..."`
   - `"Transcription successful: ..."`
   - Any ERROR messages starting with "Fallback stop failed" or "Transcription error"

### Sample Success Log
```
Calling Google Cloud Speech-to-Text API...
Transcription successful: the device needs a new screen
```

### Sample Error Log
```
Fallback stop failed: Error: Transcription API error: 401
```

## Troubleshooting Decisions

If test FAILS, check:

### Red button doesn't appear
- [ ] Is SpeechRecognition API detected on desktop? (Yes = should go to on-device path)
- [ ] On iPad, should always fallback to MediaRecorder path
- **Solution**: Check if `isListening` state is being set in `handleListenStart()`

### Transcription doesn't appear after release (iPad)
- [ ] Is "Transcribing audio..." message showing?
  - If YES: Waiting for Cloud Function response (check network in DevTools)
  - If NO: Audio may not have recorded properly
- [ ] Check Safari console for errors
- **Solution**: Verify microphone permission and network connectivity

### "Speech recognition not supported on this browser"
- [ ] On desktop: Normal alert for old browsers (skip)
- [ ] On iPad: Should not see this; should fall back to MediaRecorder instead
- **Solution**: Check if `mediaRecorderRef` is initialized properly

### High Transcription Latency (>10 seconds)
- [ ] Check network speed (iPad Wi-Fi signal strength)
- [ ] Check audio length (longer audio = longer processing)
- **Solution**: Move closer to Wi-Fi router or check Cloud Function logs for timeouts

## Logs to Monitor

### Firebase Cloud Functions Logs
1. Go to: https://console.firebase.google.com/project/supportkiosk-b43dd/functions/logs
2. Filter by function: `api`
3. Look for entries with:
   - `Calling Google Cloud Speech-to-Text API...`
   - `Transcription successful:`
   - `Error in transcribeAudio:`

### Example Success Log Entry
```
timestamps: Oct 24, 2025 3:45:22 PM
severity: INFO
text: Calling Google Cloud Speech-to-Text API...
textPayload: "Transcription successful: the device has a cracked screen"
```

### Example Error Log Entry
```
timestamps: Oct 24, 2025 3:46:10 PM
severity: ERROR
text: Error in transcribeAudio: Error: UNAUTHENTICATED: The caller does not have permission
```

## Success Criteria

**Test PASSES if:**
- ✅ Desktop: Live transcript visible while speaking, button RED
- ✅ iPad: Message shows "Recording...", button RED, audio captured
- ✅ iPad: Transcript appears 2-5 seconds after release
- ✅ iPad: Waiver submission completes with transcribed text
- ✅ No errors in console or Firebase logs
- ✅ At least 3 consecutive successful transcriptions on iPad

**Test FAILS if:**
- ❌ iPad: No button RED indicator
- ❌ iPad: No "Recording..." message
- ❌ iPad: No transcript appears after 10+ seconds
- ❌ Errors in Firebase logs showing "UNAUTHENTICATED" or "UNAVAILABLE"
- ❌ App crashes or freezes after Hold to Speak

## Next Steps After Testing

1. **If Successful**: Deploy to production and notify staff
2. **If Issues Found**:
   - Document the specific error in console
   - Check Cloud Function logs for error details
   - Create GitHub issue with reproduction steps
   - Test on different iPad models/iOS versions if possible

## Questions?

For support, check:
1. Firebase Console → Functions → Logs (real-time error monitoring)
2. Google Cloud Console → Speech-to-Text → Quotas (usage monitoring)
3. App source: `kiosk-app/src/App.js` (look for `handleListenStart` and `handleListenStop`)
