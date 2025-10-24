# ID Verification with Name Fallback - User Flow

## 📋 Overview

The verification system now uses a **primary ID method with automatic fallback** approach:

1. **Primary:** Scan badge or say ID number
2. **Fallback:** Search by name if ID verification fails
3. **Visual Cues:** Clear error messages guide users to fallback option

---

## 🔄 User Flows

### ✅ Successful Badge Scan
```
User approaches kiosk
    ↓
Taps "Check In For Tech Help"
    ↓
Sees: "Please align your ID badge inside the box"
    ↓
Scans badge → System finds user → Confirms identity
    ↓
Flow continues
```

---

### ❌ Failed Badge Scan → Name Fallback
```
User taps "Scan ID Badge"
    ↓
Camera activates, scanning ready
    ↓
User holds up badge, but system doesn't find them
    ERROR: "I couldn't find that ID. No worries! 
            Please say your name instead and I'll look you up."
    ↓
User sees: "Hold to Speak" button
    ↓
User says their name (e.g., "John Smith")
    ↓
System searches by name → Finds user → Confirms identity
    ↓
Flow continues
```

---

### ✅ Direct Voice ID Number
```
User taps "Say ID Number"
    ↓
Microphone activates
    ↓
User says their ID number
    ↓
System verifies ID → Finds user → Confirms identity
    ↓
Flow continues
```

---

### ❌ Voice ID Number Fails → Name Fallback
```
User taps "Say ID Number"
    ↓
Says ID number, but system doesn't find them
    ERROR: "Couldn't find that ID. Please say your name 
            instead and I'll look you up."
    ↓
User hears: "Listening..." prompt
    ↓
User says their name
    ↓
System searches by name → Finds user → Confirms identity
    ↓
Flow continues
```

---

### ❌ Name Lookup Fails → Retry Options
```
User tried scanning or voice ID
    ↓
User said their name (fallback)
    ↓
System still couldn't find them
    ERROR: "Sorry, I couldn't find anyone named 'John'. 
            Please check the spelling or try scanning your badge again."
    ↓
User sees TWO options:
    [🔲 Try Scanning Badge Again]
    [🎙️ Try Saying Name Again]
    ↓
User picks their preferred method and tries again
```

---

## 💬 Error Messages & Guidance

### Level 1: ID Scan/Voice Fails (Primary Method)
```
Scenario: Badge scan returns no results
Message: "I couldn't find that ID. No worries! Please say 
         your name instead and I'll look you up."
Action:  Automatically shows "Hold to Speak" button
Status:  'awaiting_name_fallback'
```

### Level 2: Name Lookup Fails (Fallback Method)
```
Scenario: Name spoken doesn't match anyone in system
Message: "Sorry, I couldn't find anyone named 'John'. 
         Please check the spelling or try scanning your 
         badge again."
Action:  Shows two retry buttons
Status:  'name_lookup_failed'
```

### Level 3: Multiple Possible Matches
```
Scenario: ID or name matches multiple users
Message: "I found a few people. Please tap your name 
         to continue."
Action:  Shows list of matching users
Status:  'awaiting_selection'
```

---

## 🎯 Status States (Updated)

### Verification States:
| State | Scenario | User Sees |
|-------|----------|-----------|
| `awaiting_init` | Fresh start | Choose: Scan or Say ID |
| `awaiting_scan` | User tapped scan | Camera active, scanning |
| `awaiting_name` | Initial voice input | Microphone active, listening |
| `awaiting_name_fallback` | Fallback after failed scan | "Say your name" prompt |
| `name_lookup_failed` | Failed name lookup | Retry options |
| `awaiting_selection` | Multiple matches found | List of names to select |
| `awaiting_id_confirmation` | One name match found | "Is this correct?" |
| `awaiting_barcode_confirmation` | Badge scan successful | "Is this correct?" |
| `verifying` | Processing lookup | "One moment..." |

---

## 🔀 Decision Tree

```
Start Verification
    │
    ├─ [Scan ID Badge]
    │   ├─ Success → Confirm identity → Continue ✓
    │   └─ Failed  → Show name input prompt
    │       ├─ Name matches 1 person → Confirm ✓
    │       ├─ Name matches multiple → Show list ✓
    │       └─ Name no match → Show retry options
    │           ├─ [Try Scan Again] → Back to scan
    │           └─ [Try Name Again] → Back to name input
    │
    └─ [Say ID Number]
        ├─ Success → Confirm identity → Continue ✓
        └─ Failed  → Show name input prompt
            ├─ Name matches 1 person → Confirm ✓
            ├─ Name matches multiple → Show list ✓
            └─ Name no match → Show retry options
                ├─ [Try Scan Again] → Go to scan
                └─ [Try Name Again] → Back to name input
```

---

## 🎨 UI Components

### Initial Choice Screen
```
┌──────────────────────────────────────┐
│  Welcome to Tech Support             │
│  How would you like to identify?     │
│                                      │
│  [🔲 Scan ID Badge]                 │
│  Hold badge up to camera             │
│                                      │
│  [🎙️ Say ID Number]                 │
│  Hold to speak                       │
└──────────────────────────────────────┘
```

### Scan Active
```
┌──────────────────────────────────────┐
│  Please align your ID badge          │
│  inside the box.                     │
│                                      │
│  ╔════════════════════════════╗      │
│  ║  (Camera view showing)     ║      │
│  ║  ◆ SCANNING LINE ◆        ║      │
│  ╚════════════════════════════╝      │
│                                      │
│  Or, if you can't scan:              │
│  [🎙️ Hold to Speak]                 │
└──────────────────────────────────────┘
```

### ID Lookup Failed - Show Fallback
```
┌──────────────────────────────────────┐
│  I couldn't find that ID. No worries!│
│  Please say your name instead and    │
│  I'll look you up.                   │
│                                      │
│  [🎙️ Hold to Speak]                 │
│  Listening...                        │
└──────────────────────────────────────┘
```

### Name Lookup Failed - Retry Options
```
┌──────────────────────────────────────┐
│  Sorry, I couldn't find anyone       │
│  named 'John'. Please check the      │
│  spelling or try scanning your       │
│  badge again.                        │
│                                      │
│  Would you like to try again?        │
│                                      │
│  [🔲 Try Scanning Badge Again]      │
│  [🎙️ Try Saying Name Again]        │
└──────────────────────────────────────┘
```

---

## 👥 Verification Methods Comparison

| Method | Speed | Accuracy | When to Use |
|--------|-------|----------|------------|
| **Scan Badge** | Fast (1-2 sec) | Very High | Primary method, preferred |
| **Say ID Number** | Medium (2-3 sec) | High | If no badge/dark barcode |
| **Say Name** (Fallback) | Slower (3-5 sec) | Medium | When ID methods fail |

---

## 🛡️ Edge Cases Handled

### 1. Badge Scan Fails (Camera Issues)
- System shows fallback option
- User can say ID or name instead
- No dead ends

### 2. ID Number Spoken Unclearly
- System treats as name lookup
- Falls back to visual retry options
- User can try again

### 3. Multiple Name Matches
- System shows list: "I found 3 people named John"
- User taps their name
- Avoids guessing wrong person

### 4. Name Still Not Found
- Shows friendly error
- Offers retry buttons
- Can try scanning again

### 5. Persistent Failures
- After multiple failures, can exit
- Or try different method
- No infinite loops

---

## 🔧 Implementation Details

### New States Added:
- `awaiting_name_fallback` - Shown when ID scan fails
- `name_lookup_failed` - Shown when name lookup fails

### Error Messages Enhanced:
- **Primary failure:** "I couldn't find that ID. Please try saying your name..."
- **Fallback failure:** "I couldn't find anyone named 'X'. Let's try again..."

### Handlers Added:
- `handleRetryScanning()` - Reset and go back to scan
- `handleRetrySpeaking()` - Reset and go back to name input

### New Props for LiveStatusDisplay:
- `onRetryScanning` - Handler for "Try Scanning" button
- `onRetrySpeaking` - Handler for "Try Speaking" button

---

## ✅ Testing Scenarios

### Scenario 1: Successful Scan
1. Click "Scan ID Badge"
2. System finds badge
3. Confirms: "Is this correct?"
4. ✅ PASS

### Scenario 2: Failed Scan → Successful Name
1. Click "Scan ID Badge"
2. Badge doesn't scan
3. System shows: "Say your name"
4. User says name
5. System finds user
6. ✅ PASS

### Scenario 3: Voice ID Fails → Successful Name
1. Click "Say ID Number"
2. System doesn't find ID
3. Automatic fallback to name input
4. User says name
5. System finds user
6. ✅ PASS

### Scenario 4: Multiple Matches
1. Badge or voice ID matches multiple users
2. System shows list
3. User selects correct name
4. ✅ PASS

### Scenario 5: Name Still Not Found
1. Badge scan fails
2. Name lookup fails
3. System shows retry options
4. User tries scanning again
5. ✅ PASS (or can retry name)

---

## 📱 User Experience Flow

```
Student walks up to kiosk
    ↓
Sees clear options (Scan or Say ID)
    ↓
Picks their preferred method
    ↓
System tries that method
    ├─ Success → Identifies student → Continues
    └─ Fails → Offers alternative method automatically
        ├─ Alternative succeeds → Identifies student → Continues
        └─ Alternative fails → Shows retry buttons
            ├─ Student retries with original method → Try again
            └─ Student retries with other method → Try again
```

---

## 🎯 Benefits

✅ **Robust:** Multiple methods, fallbacks for each
✅ **User-Friendly:** Clear guidance at each step
✅ **Flexible:** Users can switch methods if needed
✅ **Accessible:** Options for different abilities
✅ **No Dead Ends:** Always a way forward (or retry)
✅ **Transparent:** Users understand what's happening

---

**Status:** Ready for Testing ✅
**Last Updated:** October 22, 2025
