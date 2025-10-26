# Medical Dispatcher System

## Overview

The Medical Dispatcher system connects Gemini AI analysis with Claude text model to provide real-time medical guidance. It acts as a bridge between visual analysis and conversational AI guidance.

## Architecture

```
Camera → Gemini AI → Medical Dispatcher → Claude Text Model → User Guidance
```

### Components

1. **`services/medicalDispatcher.ts`** - Formats Gemini output for Claude input
2. **`services/emergencyCoordinator.ts`** - Orchestrates the entire flow
3. **`services/claudeExport.ts`** - Utilities for debugging and testing

## How It Works

### 1. Gemini Analysis
- Camera captures image
- Gemini AI analyzes for medical procedure guidance
- Returns structured detection data with coordinates

### 2. Dispatcher Processing
- Formats Gemini output into Claude-friendly JSON
- Adds context (session, timing, user feedback)
- Creates system prompts for medical procedures

### 3. Claude Input Format
```json
{
  "systemPrompt": "Medical dispatcher instructions...",
  "userMessage": "Emergency guidance request with context...",
  "context": {
    "geminiAnalysis": { /* Gemini detection results */ },
    "currentMode": "cpr",
    "userContext": { /* Session info */ },
    "emergencyContext": { /* Timing and procedure step */ }
  },
  "expectedOutput": "JSON format for dispatcher response"
}
```

### 4. Expected Claude Output
```json
{
  "guidance": {
    "primary": "Main instruction",
    "secondary": "Additional context",
    "urgency": "critical"
  },
  "corrections": {
    "position": { "x": 0.4, "y": 0.5, "instruction": "Move here" },
    "technique": { "issue": "Hands too high", "correction": "Lower hands" }
  },
  "nextAction": {
    "action": "Continue compressions",
    "timing": 30,
    "priority": 5
  },
  "voiceGuidance": {
    "speak": "Good! Keep going!",
    "tone": "encouraging"
  },
  "hapticFeedback": {
    "type": "success",
    "pattern": [100, 50, 100]
  }
}
```

## Usage in App

### UI Integration
- **🎯 Start Dispatcher** - Begins continuous analysis
- **🎯 Dispatcher Now** - Single analysis
- **Floating Overlays** - Show dispatcher guidance and Claude input

### Features
- **Real-time Guidance** - Continuous medical procedure coaching
- **Position Corrections** - Specific hand placement adjustments
- **Voice Feedback** - Spoken instructions with appropriate tone
- **Haptic Feedback** - Tactile responses for success/errors
- **JSON Export** - Debug Claude input data

## Testing

### Mock Responses
The system includes mock responses for testing without Claude API:
- Mode-specific guidance (CPR, Airway, Pulse, Seizure)
- Realistic medical instructions
- Proper urgency levels

### Debug Tools
- `exportClaudeInput()` - Export current session data
- `logClaudeInput()` - Console logging for debugging
- `createSampleClaudeInput()` - Generate test data

## Next Steps

1. **Connect Claude API** - Replace mock responses with real Claude API calls
2. **Fine-tune Prompts** - Optimize system prompts for medical accuracy
3. **Add Voice Synthesis** - Implement text-to-speech for guidance
4. **Enhanced Haptics** - More sophisticated vibration patterns
5. **Session Recording** - Save emergency sessions for analysis

## File Structure

```
services/
├── medicalDispatcher.ts      # Core dispatcher logic
├── emergencyCoordinator.ts  # Orchestration service
├── claudeExport.ts          # Debug utilities
├── gemini.ts               # Existing Gemini service
└── computerVision.ts       # Existing CV service
```

The dispatcher system is now ready for Claude API integration!
