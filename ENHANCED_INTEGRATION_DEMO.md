# Raw Text Analysis Integration Demo

## Overview
This integration sends only the raw text analysis from Gemini to Claude, providing rich contextual understanding for medical guidance without structured detection data.

## Data Flow

### 1. Gemini Analysis (Raw Text Only)
```typescript
// Gemini returns structured data + raw analysis
{
  detections: [...], // Not sent to Claude
  overallInstruction: "CPR: Place hands on center of chest", // Not sent to Claude
  rawTextAnalysis: "I can see a person lying on their back. The chest area is clearly visible and accessible. The person appears to be unconscious and not breathing. For CPR, you should place your hands on the center of the chest, specifically the lower half of the sternum. The hands should be positioned with one hand on top of the other, fingers interlaced, and the heel of the bottom hand on the sternum. Compress at least 2 inches deep at a rate of 100-120 compressions per minute..."
}
```

### 2. Medical Dispatcher Formatting (Raw Text Only)
```typescript
// Only raw text analysis is sent to Claude
const formatted = `
GEMINI VISUAL ANALYSIS:
I can see a person lying on their back. The chest area is clearly visible and accessible. The person appears to be unconscious and not breathing. For CPR, you should place your hands on the center of the chest, specifically the lower half of the sternum. The hands should be positioned with one hand on top of the other, fingers interlaced, and the heel of the bottom hand on the sternum. Compress at least 2 inches deep at a rate of 100-120 compressions per minute...
`;
```

### 3. Claude Input (Raw Text Only)
Claude receives:
- **Raw text analysis** describing what Gemini sees and its reasoning
- **Context** about the medical procedure and user state
- **No structured coordinates** - Claude interprets the scene from the description

## Benefits

1. **Natural Language Understanding**: Claude works with natural language descriptions rather than coordinates
2. **Contextual Reasoning**: Claude can understand the full scene context from Gemini's analysis
3. **Flexible Guidance**: Claude can provide guidance based on scene understanding, not just coordinates
4. **Simplified Integration**: No need to manage structured data formatting

## Example Response

### Input to Claude:
```
GEMINI VISUAL ANALYSIS:
I can see a person lying on their back. The chest area is clearly visible and accessible. The person appears to be unconscious and not breathing. For CPR, you should place your hands on the center of the chest, specifically the lower half of the sternum...
```

### Claude's Response:
```json
{
  "voiceGuidance": {
    "speak": "I can see the person's chest clearly. Place your hands on the center, right where the sternum is most prominent. The person appears unconscious, so we need to start compressions immediately.",
    "tone": "urgent"
  }
}
```

## Implementation Details

### Files Modified:
1. `services/gemini.ts` - Added `rawTextAnalysis` to `GeminiResponse` interface
2. `services/medicalDispatcher.ts` - Modified to send only raw text analysis
3. System prompts updated to focus on raw text interpretation

### Key Changes:
- `parseGeminiResponse()` captures raw text analysis
- `formatGeminiAnalysis()` sends only raw text to Claude
- System prompt explains Claude will receive raw text descriptions
- No structured coordinates are sent to Claude

This approach leverages Gemini's natural language analysis capabilities while keeping the integration simple and focused on contextual understanding.
