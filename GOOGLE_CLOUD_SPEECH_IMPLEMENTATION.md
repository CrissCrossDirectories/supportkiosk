# Google Cloud Speech-to-Text Integration for iPad Support

## Overview
This implementation enables speech-to-text transcription on iOS 17.8 iPads running Safari, which don't natively support the Web Speech API. The solution uses a hybrid approach:

1. **Desktop/Web Browsers** → Use on-device Web Speech API for instant transcription
2. **iOS Devices (iPad/iPhone)** → Record audio and send to Google Cloud Speech-to-Text API for server-side transcription

## Architecture

### Frontend Changes (`kiosk-app/src/App.js`)

#### 1. iOS Detection Utility
```javascript
const isIOS = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipot/.test(userAgent) && !window.MSStream;
};
```

#### 2. Enhanced `handleListenStart()`
- Detects if `SpeechRecognition` API is available
- If available: Uses native Web Speech API (instant transcription)
- If unavailable: Falls back to MediaRecorder for audio capture
- Shows iOS-specific user messaging: "🎤 Recording... Please speak clearly. We'll transcribe your audio on our server."

#### 3. Enhanced `handleListenStop()`
- For fallback recording (iOS):
  - Stops MediaRecorder
  - Converts recorded audio blob to Base64
  - Sends to Cloud Function endpoint `/transcribeAudio`
  - Displays "Transcribing audio..." while waiting
  - Shows returned transcript in UI
  - Calls `summarizeWaiverReason()` with transcribed text

### Backend Changes (`functions/index.js`)

#### New Cloud Function Endpoint: `/transcribeAudio`
- **Method**: POST
- **Endpoint**: `https://us-central1-supportkiosk-b43dd.cloudfunctions.net/transcribeAudio`
- **Request Body**:
  ```json
  {
    "audioData": "base64-encoded-audio",
    "encoding": "MP4",
    "sampleRateHertz": 16000,
    "languageCode": "en-US"
  }
  ```
- **Response**:
  ```json
  {
    "transcript": "transcribed text here"
  }
  ```

#### Implementation Details
- Uses `@google-cloud/speech` v7.2.1 (Google Cloud Client Library)
- Automatically uses Firebase Admin SDK credentials (Application Default Credentials)
- Supports multiple audio formats: MP4, WAV, FLAC, OGG_OPUS, LINEAR16, MULAW
- Supports 100+ languages via `languageCode` parameter

## Deployment Status

### ✅ Completed
- [x] Added `@google-cloud/speech` dependency to `functions/package.json`
- [x] Implemented `/transcribeAudio` Cloud Function endpoint
- [x] Added iOS detection utility (`isIOS()`)
- [x] Updated `handleListenStart()` with fallback audio capture
- [x] Updated `handleListenStop()` with Google Cloud Speech-to-Text integration
- [x] Added iOS-specific user messaging
- [x] Deployed to Firebase (all functions updated successfully)

### ✅ Cloud Function Deployment
```
✔ functions[api(us-central1)] Successful update operation.
Function URL (api(us-central1)): https://api-2ijpyfy5gq-uc.a.run.app
```

## User Experience Flow

### Desktop/Supported Browser
1. User presses "Hold to Speak" button
2. Web Speech API activates
3. Button turns RED (listening state)
4. Live interim transcription appears in real-time
5. User speaks
6. Transcription updates live as they speak
7. User releases button
8. Final transcript is sent to `summarizeWaiverReason()`
9. AI summary is generated

### iPad/iOS 17.8 Safari
1. User presses "Hold to Speak" button
2. Fallback MediaRecorder activates
3. Button turns RED (listening state)
4. Message shows: "🎤 Recording... Please speak clearly. We'll transcribe your audio on our server."
5. User speaks
6. User releases button
7. Audio is encoded to Base64 and sent to Cloud Function
8. "Transcribing audio..." message displays
9. Google Cloud Speech-to-Text processes the audio
10. Transcript is returned to frontend
11. Transcript is sent to `summarizeWaiverReason()`
12. AI summary is generated (same as desktop)

## Troubleshooting

### Speech Recognition Not Working on iPad
1. **Check Microphone Permission**
   - Settings → Safari → Tech Support Kiosk → Microphone → Allow
   - Settings → Privacy → Microphone → Safari → Allow

2. **Check Network Connection**
   - Ensure iPad is connected to the same network as kiosk infrastructure
   - Google Cloud Speech-to-Text requires internet connectivity

3. **Check Browser Console**
   - Open Safari Developer Tools
   - Check console for error messages
   - Common errors: Permission denied, Network error, Quota exceeded

### Cloud Function Errors
1. **Authentication Error**: Ensure the Cloud Function can access Google Cloud Speech-to-Text API
   - Verify service account has `Speech-to-Text Admin` or `Speech-to-Text Viewer` role
   - This is typically handled automatically by Firebase Admin SDK

2. **Rate Limiting**: If users submit many audio clips rapidly
   - Google Cloud Speech-to-Text has quotas (typically 1 million requests/month)
   - Monitor usage in Google Cloud Console → Cloud Speech-to-Text → Quotas

3. **Audio Quality Issues**
   - Ensure iPad microphone is clean and not obstructed
   - Minimize background noise in kiosk environment
   - Speak clearly and at normal volume

## Performance Considerations

### Desktop (Web Speech API)
- **Latency**: <100ms per interim result (on-device)
- **Cost**: $0 (uses browser API)
- **Fallback**: Works offline

### iPad (Google Cloud Speech-to-Text)
- **Latency**: 2-5 seconds per audio clip (network + processing)
- **Cost**: ~$0.024 per 15 seconds of audio (billed monthly)
- **Fallback**: If transcription fails, audio is still uploaded and user sees "Audio recorded - transcription not available"

## Cost Estimation

**Assuming 100 iPad kiosk users per day, 2 check-ins per user:**
- 100 users × 2 check-ins × 365 days = 73,000 transcriptions/year
- 73,000 × $0.024 per 15 seconds = ~$1,752/year (assuming 15-30 second average audio)
- Daily cost: ~$4.80

**Billing is per 15-second increments**, so a 1-second audio clip costs the same as a 15-second clip.

## Google Cloud Setup

### IAM Permissions Required
The Firebase Admin SDK service account needs:
- `Speech-to-Text Admin` or `Speech-to-Text Viewer` role (auto-configured if Cloud Function uses Application Default Credentials)

### Enable Google Cloud Speech-to-Text API
```bash
gcloud services enable speech.googleapis.com --project=supportkiosk-b43dd
```

### Quotas
Monitor and set budgets in:
- Google Cloud Console → Billing → Budgets & alerts
- Set budget for Cloud Speech-to-Text to prevent unexpected costs

## Testing Checklist

- [ ] Test on desktop/laptop with Web Speech API
  - [ ] Verify live transcription appears
  - [ ] Verify button turns RED while listening
  - [ ] Verify transcript is passed to summarize function
  
- [ ] Test on iPad with iOS 17.8
  - [ ] Verify microphone permission prompt appears
  - [ ] Verify "Recording..." message appears
  - [ ] Verify button turns RED while recording
  - [ ] Verify audio is captured correctly
  - [ ] Verify "Transcribing audio..." message appears while processing
  - [ ] Verify transcript is returned and passed to summarize function
  - [ ] Verify error handling if transcription fails

- [ ] Test error scenarios
  - [ ] Network disconnected on iPad
  - [ ] Microphone permission denied
  - [ ] Very quiet/silent audio clip
  - [ ] Very long audio clip (>5 minutes)

- [ ] Monitor logs and costs
  - [ ] Check Firebase Cloud Functions logs for errors
  - [ ] Monitor Google Cloud Speech-to-Text API quotas
  - [ ] Set up billing alerts

## Future Enhancements

1. **Multi-language Support**: Add language selector to detect user's preferred language
2. **Audio File Storage**: Archive audio files in Google Cloud Storage for compliance
3. **Confidence Scores**: Display confidence percentage for transcriptions
4. **Real-time Streaming**: For very long messages, stream audio instead of buffering
5. **Offline Fallback**: Cache transcriptions locally on iPad for later sync

## Related Files
- `kiosk-app/src/App.js` → Frontend implementation
- `functions/index.js` → Cloud Function backend
- `functions/package.json` → Dependencies
- `firebase.json` → Firebase configuration
