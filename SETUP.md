# XR 911 - AI-Powered Emergency Medical Guidance

## 🚀 Setup Instructions

### 1. Get Your Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure the API Key

**Option A: Environment Variable (Recommended)**
1. Create a `.env` file in your project root
2. Add your API key:
```
EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
```

**Option B: Direct Configuration**
1. Open `config/api.ts`
2. Replace the empty string with your API key:
```typescript
export const API_CONFIG = {
  GEMINI_API_KEY: 'your_actual_api_key_here',
};
```

### 3. Test the App
1. Run `npm start` or `expo start`
2. Click "Start Emergency"
3. Try the "🤖 AI Analyze" button to test the AI integration

## 🎯 Features

- **Real-time AI Analysis**: Gemini API analyzes camera feed for medical guidance
- **AR Tracking**: Dynamic boxes show exactly where to focus for medical procedures
- **Emergency Modes**: Airway, CPR, Pulse Check, and Seizure monitoring
- **Visual Feedback**: Color-coded guidance with haptic feedback
- **Full-screen Emergency Mode**: Tab bar hidden during emergency for focus

## 🔧 Troubleshooting

- **"Analysis failed"**: Check your API key configuration
- **No detection boxes**: Ensure good lighting and clear view of the patient
- **API errors**: Verify your Gemini API key is valid and has quota remaining

## 📱 Usage

1. **Start Emergency**: Tap the red button on the home screen
2. **Select Mode**: Choose Airway, CPR, Pulse, or Seizure
3. **AI Analysis**: Tap "🤖 AI Analyze" for real-time guidance
4. **Follow Guidance**: AI boxes show exactly where to place hands/focus
5. **End Emergency**: Green button in top-right to exit

The AI will provide precise coordinates for medical procedures, making emergency response more accurate and effective.
