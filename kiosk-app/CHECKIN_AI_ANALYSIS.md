# Check-In Flow AI Analysis & Enhancement Plan

## Design Context

**Use Case:** School kiosk where students check in BEFORE seeing the tech
- Multiple students waiting in line
- Need fast check-in process (~60-90 seconds)
- Tech needs rich context to diagnose problem
- Optional: Students can try troubleshooting tips while waiting

---

## Current Implementation Assessment

### What's Working ✅

1. **AI Clarification Framework Exists**
   - Uses Gemini API to generate follow-up questions
   - Tracks conversation history
   - Limits to 2 clarifications via `clarificationCount`
   - Generates structured JSON responses

2. **Basic Flow**
   - User describes problem
   - AI decides: ask clarification OR summarize
   - Max 2 follow-up questions
   - Produces final summary with issue path

3. **Status Tracking**
   - `awaiting_problem`: Initial problem capture
   - `awaiting_clarification`: Follow-up question state
   - Response routing based on question count

### Issues & Gaps ❌

#### 1. **No User History Context**
**Current:** AI sees only the current conversation
```javascript
// Problem: Only current conversation in history
const prompt = `...Conversation History: ${history.map(...).join('\n')}...`;
```
**Impact:** Can't ask "Have you tried restarting?" if user had screen issues before

**Missing:**
- Prior ticket history for this user
- Common issues for their device type
- Previous solutions attempted

#### 2. **Limited Device Context**
**Current:** Only has device name and model
```javascript
const assetInfo = asset ? `The user is having a problem with their ${asset.Name} (Model: ${asset.Model?.Name || 'N/A'}).` : "...";
```
**Missing:**
- Device age/purchase date
- Prior repairs/tickets on THIS device
- Common failure modes for this model
- Asset condition history

#### 3. **Questions Not Context-Aware Enough**
**Current Example Generated Questions:**
- "Can you tell me more about what's happening?"
- "Have you encountered this issue before?"

**Better Questions Would Be:**
- "Have you recently dropped the device or got it wet?" (if Macbook + liquid damage keywords)
- "Does this only happen after startup or all the time?" (if software issue keywords)
- "Is this the same screen issue you reported last month?" (if history + screen keywords match)

#### 4. **No Device-Specific Troubleshooting**
**Current:** Generic IT support phrasing
**Should Be:** Device-specific based on asset type
- iPad: "Is the screen response slow or unresponsive?"
- Laptop: "Are you seeing any error messages or spinners?"
- Desktop: "Is the monitor detecting a signal?"

#### 5. **Summary Lacks Rich Detail**
**Current Summary Output:**
```
User John has a laptop that won't turn on. They haven't tried force restarting.
```

**Better Summary Should Include:**
- **Primary Issue:** Screen unresponsive
- **Context:** This device has 2 prior water damage incidents
- **Specifics:** "Only affects top-left quadrant, intermittent"
- **Tried:** "Attempted restart, no change"
- **Urgency:** High (user relies on device for work)
- **Suggested Category:** Hardware > Touch Digitizer

#### 6. **No "Tried Already" Tracking**
AI doesn't explicitly ask what troubleshooting user has ALREADY TRIED
- This wastes a follow-up question
- Creates repeat solutions

### Flow Diagram - Current vs Proposed (Fast-Path Optimized)

**Current Flow:**
```
Problem Input
    ↓
Question 1 Generated (generic)
    ↓
User Answer
    ↓
Question 2 Generated (still generic)
    ↓
User Answer
    ↓
Summary (basic)
    ↓
Ticket Created
```

**Proposed Flow (Fast-Path for Kiosk Line):**
```
Problem Input (e.g., "iPad won't charge")
    ↓
Load User History ← NEW (async, doesn't block UI)
Load Device History ← NEW
    ↓
AI Analyzes: Is info sufficient or need 1 follow-up?
    ├─ If sufficient → Skip to Ticket Preview
    └─ If need more → Ask 1 Strategic Question
    ↓
User Answer (or skip if line is long)
    ↓
Create Rich Ticket Summary with:
  • Primary issue + specifics
  • Device history context
  • User's prior issues with this device
  • Suggested urgency level
  • Recommended ticket category
    ↓
Ticket Preview + Button Options:
  ├─ ✅ "Looks Good - Create Ticket" → Ticket Created
  ├─ 🔧 "Show Me Troubleshooting Tips" → Optional Help Screen
  └─ ❌ "Start Over" → Reset flow
    ↓
[If clicked troubleshooting] Show tips while in queue
[Ticket created] Display confirmation, back to home
```

**Key Differences:**
- ⏱️ Optimized for speed: 1 question max (not 2), can skip if line exists
- 📋 Rich ticket summary shown BEFORE creation (student sees what tech will see)
- 🔧 Troubleshooting is OPTIONAL, doesn't block check-in
- 📊 Ticket preview builds confidence and catches errors

---

## Enhancement Implementation Plan (Fast-Path Optimized)

### New App States for Fast-Path Flow

```javascript
const CheckInFlow = ({ onExit, cameraDeviceId }) => {
    // Existing states...
    
    // NEW: For fast-path optimization
    const [assetHistory, setAssetHistory] = useState(null);
    const [userHistory, setUserHistory] = useState(null);
    const [showTroubleshootingOption, setShowTroubleshootingOption] = useState(false);
    const [troubleshootingTips, setTroubleshootingTips] = useState([]);
    const [ticketSummary, setTicketSummary] = useState(null);
    
    // Status values: 
    // 'verifying_user', 'processing', 'awaiting_asset_selection',
    // 'awaiting_problem', 'awaiting_clarification' (MAX 1 question),
    // 'ticket_preview', 'troubleshooting_view', 'confirming'
};
```

### Phase 1: History Loading (Doesn't Block Flow)

#### 1.1 Load History Asynchronously

```javascript
const getUserHistoryContext = async (userId, assetId) => {
  try {
    // Query prior 5 user tickets
    const userTickets = await getDocs(query(
      collection(db, "tickets"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(5)
    ));
    
    // Query prior 10 asset tickets
    const assetTickets = await getDocs(query(
      collection(db, "tickets"),
      where("assetTag", "==", assetId),
      orderBy("createdAt", "desc"),
      limit(10)
    ));
    
    // Extract patterns
    const commonPatterns = extractCommonPatterns(
      [...userTickets.docs, ...assetTickets.docs]
    );
    
    return {
      userTicketHistory: userTickets.docs.map(d => d.data()),
      assetTicketHistory: assetTickets.docs.map(d => d.data()),
      commonPatterns: commonPatterns,
      lastRepairDate: getLastRepairDate(assetTickets.docs),
      deviceAge: calculateDeviceAge(assetId),
    };
  } catch (error) {
    console.error("History fetch failed:", error);
    return null;  // Don't block flow if history unavailable
  }
};

// Helper to extract patterns from tickets
const extractCommonPatterns = (tickets) => {
  const patterns = {};
  tickets.forEach(ticket => {
    const problem = ticket.problemDescription.toLowerCase();
    if (problem.includes('screen')) patterns.screen = (patterns.screen || 0) + 1;
    if (problem.includes('battery')) patterns.battery = (patterns.battery || 0) + 1;
    if (problem.includes('charge')) patterns.charge = (patterns.charge || 0) + 1;
    if (problem.includes('keyboard')) patterns.keyboard = (patterns.keyboard || 0) + 1;
    // ... etc
  });
  return Object.entries(patterns)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k);
};
```

#### 1.2 Start Loading History When Asset Selected

```javascript
const handleAssetSelection = async (asset) => {
  setIdentifiedAsset(asset);
  
  // Start loading history in background (don't wait)
  if (iiqUser && asset.AssetId) {
    getUserHistoryContext(iiqUser.UserId, asset.AssetId)
      .then(history => setAssetHistory(history))
      .catch(err => console.error("History load failed:", err));
  }
  
  // Move to problem input immediately
  setStatus('awaiting_problem');
};
```

### Phase 2: Smart Question Generation (1 Question MAX)

#### 2.1 Decide: Ask Question or Skip Straight to Summary?

```javascript
const shouldAskClarificationQuestion = (problemText, assetHistory) => {
  // If history shows EXACT same pattern, skip question
  if (assetHistory?.commonPatterns?.length > 0) {
    const patterns = assetHistory.commonPatterns.join('|');
    if (new RegExp(patterns, 'i').test(problemText)) {
      // This is a repeated issue - we likely have enough context
      return false;
    }
  }
  
  // If problem statement is clear and specific, skip question
  const specificKeywords = ['cracked', 'broken', 'not charging', 'won\'t turn on', 'frozen'];
  if (specificKeywords.some(kw => problemText.toLowerCase().includes(kw))) {
    return false;  // Specific enough, create ticket
  }
  
  // Otherwise, ask ONE clarifying question
  return true;
};

const startClarificationProcess = async (initialProblem) => {
  // Check if we even need a question
  if (!shouldAskClarificationQuestion(initialProblem, assetHistory)) {
    // Skip straight to summary
    await generateTicketSummary(initialProblem, assetHistory, userHistory);
    return;
  }
  
  // If we do need a question, ask ONE smart question
  setStatus('processing');
  const initialHistory = [{ role: 'user', parts: [{ text: initialProblem }] }];
  setConversationHistory(initialHistory);
  
  const result = await getSmartClarificationQuestion(
    initialHistory,
    identifiedAsset,
    assetHistory,
    visitorName
  );
  
  handleClarificationResponse(result, initialHistory);
};
```

#### 2.2 Generate ONE Smart Clarification Question

```javascript
const getSmartClarificationQuestion = async (
  history,
  asset,
  assetHistory,
  userName
) => {
  const deviceType = asset?.Name?.split(' ')[0] || 'device';
  
  // Build history context string
  const historyContext = assetHistory ? `
    RELEVANT DEVICE HISTORY:
    ${assetHistory.assetTicketHistory.slice(0, 3).map(t => 
      `- ${t.problemDescription} (${formatDate(t.createdAt)})`
    ).join('\n')}
    
    COMMON ISSUES FOR THIS DEVICE: ${assetHistory.commonPatterns.join(', ')}
  ` : '';
  
  const prompt = `
    You are an IT support technician. Your job is to ask ONE quick, smart clarification question.
    
    STUDENT: ${userName}
    DEVICE: ${asset?.Name} (${asset?.Model?.Name})
    PROBLEM: ${history[0].parts[0].text}
    
    ${historyContext}
    
    TASK: Ask ONE follow-up question that:
    1. Gets the most critical missing detail
    2. References prior history if relevant ("I see you had ${assetHistory?.commonPatterns?.[0]} issues before...")
    3. Is device-specific (e.g., iPad: "Is the screen responding?" vs MacBook: "Can you hear the fan?")
    4. Takes 10-15 seconds to answer
    
    RESPONSE: Return JSON
    {"status": "asking", "content": "Your ONE question here."}
  `;
  
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };
  
  const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
  const jsonText = result.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText);
};
```

### Phase 3: Rich Ticket Summary with Context (Before Creation)

#### 3.1 Generate Comprehensive Summary

```javascript
const generateTicketSummary = async (
  problemText,
  assetHistory,
  userHistory,
  followUpAnswer = null
) => {
  setStatus('processing');
  
  const conversationText = followUpAnswer 
    ? `Initial: ${problemText}\nFollow-up Response: ${followUpAnswer}`
    : problemText;
  
  const prompt = `
    You are an expert IT support technician creating a clear, actionable ticket summary.
    
    DEVICE: ${identifiedAsset?.Name} (${identifiedAsset?.Model?.Name})
    STUDENT: ${visitorName}
    PROBLEM STATEMENT: ${conversationText}
    
    DEVICE HISTORY:
    ${assetHistory?.assetTicketHistory?.slice(0, 3).map(t => 
      `- ${t.problemDescription} (${formatDate(t.createdAt)})`
    ).join('\n')}
    
    STUDENT'S HISTORY:
    ${userHistory?.userTicketHistory?.slice(0, 2).map(t => 
      `- ${t.problemDescription} on ${t.device} (${formatDate(t.createdAt)})`
    ).join('\n')}
    
    CREATE A TICKET SUMMARY with these fields:
    
    {
      "summary": "One clear sentence describing the issue",
      "details": "2-3 sentences with specific details and context",
      "suggestedCategory": "e.g., 'Hardware > Screen', 'Software > Performance', 'Connectivity > WiFi'",
      "suggestedUrgency": "High|Medium|Low",
      "relevantHistory": "Any related prior tickets or patterns",
      "techNotes": "Specific things tech should check",
      "troubleshootingTips": ["Tip 1 (if applicable)", "Tip 2 (if applicable)"]
    }
  `;
  
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };
  
  try {
    const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
    const jsonText = result.candidates[0].content.parts[0].text;
    const summary = JSON.parse(jsonText);
    
    setTicketSummary(summary);
    setTroubleshootingTips(summary.troubleshootingTips || []);
    setShowTroubleshootingOption(summary.troubleshootingTips?.length > 0);
    
    // Move to preview, not directly to confirmation
    setStatus('ticket_preview');
  } catch (error) {
    console.error("Summary generation failed:", error);
    setErrorMessage("Failed to generate summary. Try again?");
    setStatus('error');
  }
};
```

### Phase 4: Ticket Preview Screen (NEW UI State)

```javascript
// In LiveStatusDisplay component
if (status === 'ticket_preview' && ticketSummary) {
  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">📋 Ticket Summary</h2>
      
      {/* Summary Section */}
      <div className="bg-gray-700 p-4 rounded mb-4">
        <p className="text-lg font-semibold">{ticketSummary.summary}</p>
        <p className="text-gray-300 mt-2">{ticketSummary.details}</p>
      </div>
      
      {/* Context Section */}
      {ticketSummary.relevantHistory && (
        <div className="bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm text-gray-400">📌 Related History:</p>
          <p className="text-gray-300 text-sm">{ticketSummary.relevantHistory}</p>
        </div>
      )}
      
      {/* Tech Notes */}
      {ticketSummary.techNotes && (
        <div className="bg-gray-700 p-3 rounded mb-4">
          <p className="text-sm text-gray-400">🔧 Tech Should Check:</p>
          <p className="text-gray-300 text-sm">{ticketSummary.techNotes}</p>
        </div>
      )}
      
      {/* Category & Urgency */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-gray-700 p-3 rounded">
          <p className="text-xs text-gray-400">Category</p>
          <p className="font-semibold text-cyan-300">{ticketSummary.suggestedCategory}</p>
        </div>
        <div className="flex-1 bg-gray-700 p-3 rounded">
          <p className="text-xs text-gray-400">Urgency</p>
          <p className={`font-semibold ${
            ticketSummary.suggestedUrgency === 'High' ? 'text-red-400' :
            ticketSummary.suggestedUrgency === 'Medium' ? 'text-yellow-400' :
            'text-green-400'
          }`}>{ticketSummary.suggestedUrgency}</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => createTicket()}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg"
        >
          ✅ Looks Good - Create Ticket
        </button>
        
        {showTroubleshootingOption && troubleshootingTips.length > 0 && (
          <button
            onClick={() => setStatus('troubleshooting_view')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg"
          >
            🔧 Show Me Troubleshooting Tips
          </button>
        )}
        
        <button
          onClick={() => handleRedoProblem()}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg"
        >
          ❌ Start Over
        </button>
      </div>
    </div>
  );
}
```

### Phase 5: Optional Troubleshooting Tips View

```javascript
if (status === 'troubleshooting_view' && troubleshootingTips.length > 0) {
  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-yellow-400">🔧 Try These First</h2>
      <p className="text-gray-300 mb-4">Here are some things you can try while you wait:</p>
      
      <div className="space-y-3 mb-6">
        {troubleshootingTips.map((tip, idx) => (
          <div key={idx} className="bg-gray-700 p-4 rounded">
            <p className="font-semibold text-yellow-300 mb-2">Step {idx + 1}:</p>
            <p className="text-gray-300">{tip}</p>
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <button
          onClick={() => setStatus('ticket_preview')}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg"
        >
          ✅ Back to Ticket - Create It
        </button>
        
        <button
          onClick={() => handleRedoProblem()}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg"
        >
          ❌ Start Over
        </button>
      </div>
    </div>
  );
}
```

---

## Code Changes Required

### State Variables to Add
```javascript
const [assetHistory, setAssetHistory] = useState(null);
const [userHistory, setUserHistory] = useState(null);
const [showTroubleshootingOption, setShowTroubleshootingOption] = useState(false);
const [troubleshootingTips, setTroubleshootingTips] = useState([]);
const [ticketSummary, setTicketSummary] = useState(null);
```

### Functions to Create
1. **NEW:** `getUserHistoryContext(userId, assetId)` - Query prior tickets
2. **NEW:** `extractCommonPatterns(tickets)` - Find recurring issues
3. **NEW:** `shouldAskClarificationQuestion(problemText, assetHistory)` - Smart skip logic
4. **NEW:** `getSmartClarificationQuestion(...)` - Ask 1 strategic question
5. **NEW:** `generateTicketSummary(...)` - Create rich summary with all context
6. **NEW:** `formatDate(date)` - Helper for readable dates

### Functions to Modify
1. **handleAssetSelection()** - Start loading history
2. **startClarificationProcess()** - Check if question needed
3. **LiveStatusDisplay()** - Add `'ticket_preview'` and `'troubleshooting_view'` states
4. **createTicket()** - Use summary data for ticket creation

---

## Optimized Workflow Timeline

| Step | Duration | Action |
|------|----------|--------|
| 0s | 0-5s | Student provides problem description |
| 5s | +0-5s | History loads async (doesn't block) |
| 5s | +0-2s | AI decides: enough info or ask 1 question? |
| 7s | +0-15s | IF question needed: Student answers (or skips if line growing) |
| 22s | +0-3s | AI generates ticket summary with all context |
| 25s | - | Student reviews ticket preview |
| 30s | +0-60s | OPTION: View troubleshooting tips OR create ticket |
| 90s | - | Back to home screen, next student |

**Total: 25-90 seconds** depending on whether student tries troubleshooting

---

## Testing Scenario Examples (Fast-Path)

### Scenario 1: Specific Problem (Skip Question)
```
Student: "My iPad's screen is cracked"
History: Shows no screen issues before
AI: Problem clear ✓ → Skip question
Summary: "iPad Pro screen cracked/damaged. Recommend hardware replacement.
         Suggest: High urgency if display is functional, Medium if not."
Time: ~20 seconds
```

### Scenario 2: Vague Problem + Relevant History (Ask 1 Question)
```
Student: "My laptop keeps freezing"
History: Shows "Performance issues - apps crashing" 3 months ago
AI: Vague - ask question
Question: "Is it freezing when running specific apps, or any time you open them?"
Student: "Happens with video apps especially"
Summary: "MacBook Pro frequently freezes when running video applications.
         Similar to crash issues 3 months ago. Likely: Memory or thermal.
         Suggest: Medium urgency, performance diagnostics recommended."
Time: ~40 seconds
```

### Scenario 3: No History, Vague Problem (Ask 1 Question)
```
Student: "Something's wrong with my device"
History: First ticket from this student on this device
AI: Too vague - ask question
Question: "Can you tell me what happens when you try to use it?
          Does it turn on? Freeze? Show errors?"
Student: "Screen won't light up"
Summary: "Device won't power on. No display response. First reported issue
         on this device. Suggest: Power diagnostics, battery check."
Time: ~40 seconds
```

### Scenario 4: Long Line - Skip All Optional Steps
```
Student: "WiFi not working"
History: Loading in background (student doesn't wait)
AI: Problem clear ✓ → Skip question
Summary: Shows ticket preview
Student: Sees "Troubleshooting Tips" button but line is long
Student: Clicks "Create Ticket" to get out of line faster
Time: ~25 seconds
Next Student: Begins check-in
```

---

## UI/UX Improvements

### Before (Current)
- Student describes problem
- AI asks unclear question
- Student confused, line grows
- Eventually creates vague ticket
- Tech has to contact student for clarification

### After (Optimized)
- Student describes problem (~5s)
- AI loads context in background
- AI asks smart follow-up IF needed (~15s max)
- Student reviews rich ticket preview
  - Sees their issue summarized professionally
  - Sees what tech will see
  - Gains confidence
- Optional: Try troubleshooting tips while waiting
- Create ticket with confidence
- Tech has full context, can start diagnosing immediately

---

## Benefits Summary

