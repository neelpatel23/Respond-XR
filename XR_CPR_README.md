# XR CPR Guidance Feature

## Overview

The XR CPR Guidance feature uses Gemini Vision API to provide real-time augmented reality guidance for performing CPR on a person lying down. It detects body landmarks, identifies the proper chest compression location, and provides visual feedback for hand placement.

## Features

### 🎯 Real-time Pose Detection

- Uses Gemini Vision API for fast, accurate pose detection
- Detects if a person is lying down (horizontal orientation)
- Identifies key body landmarks (chest, hands, body position)

### 📍 AR Hand Placement Guidance

- Shows circular target marker at detected chest center
- Color-coded feedback system:
  - **Green**: Correct hand placement detected
  - **Yellow**: Hands detected but need adjustment
  - **Red**: No hands detected or incorrect position
- Hand outline guide showing proper stacking position

### 🎵 Integrated CPR Metronome

- 100-120 BPM adjustable rate
- Haptic feedback and audio cues
- Only activates when hands are correctly placed
- Visual compression depth indicator

### 📱 User Interface

- Full-screen camera view with AR overlays
- Real-time instruction text
- Status indicators and confidence levels
- Simple start/stop controls

## How to Use

1. **Launch the Feature**

   - Open the app and go to Emergency tab
   - Tap "XR CPR Guidance" button

2. **Position the Camera**

   - Point camera at person lying flat on their back
   - Ensure good lighting and clear view of the person
   - Tap "Start Detection" to begin pose analysis

3. **Follow AR Guidance**

   - Wait for the system to detect the person and chest center
   - Place your hands on the target marker shown on screen
   - Adjust hand position based on color feedback:
     - Green = Perfect placement
     - Yellow = Move closer to target
     - Red = Place hands on target

4. **Start CPR**
   - Once hands are correctly placed (green feedback)
   - Adjust CPR rate if needed (100-120 BPM)
   - Tap "Start CPR" to begin metronome
   - Follow the beat and voice cues

## Technical Implementation

### Dependencies

- `@anthropic-ai/sdk` - Gemini Vision API integration
- `expo-camera` - Camera access
- `expo-haptics` - Haptic feedback
- `expo-speech` - Voice instructions

### Key Components

- **PoseDetectionService** - Handles Gemini Vision API integration and pose detection
- **PoseOverlay** - Renders pose skeleton on camera view
- **HandPlacementGuide** - Shows target marker and hand placement feedback
- **InstructionOverlay** - Displays real-time instructions and status
- **CPRXRScreen** - Main screen with camera and AR overlays

### Performance Optimizations

- Detection throttled to 10 FPS to prevent overload
- Lower resolution images for faster processing
- Rate limiting for Gemini API calls
- Frame skipping if processing lags

## Troubleshooting

### Common Issues

1. **"Failed to load AI models"**

   - Restart the app
   - Check internet connection (models download on first use)
   - Ensure device has sufficient storage

2. **"No person detected"**

   - Improve lighting conditions
   - Ensure person is lying flat on their back
   - Adjust camera angle to see full body

3. **"Person not lying down"**

   - Person must be lying horizontally
   - Adjust person's position if possible
   - Try different camera angles

4. **Poor detection accuracy**
   - Ensure good lighting
   - Keep camera steady
   - Avoid obstructions between camera and person

### Performance Tips

- Close other apps to free up memory
- Use in well-lit environments
- Keep device charged (AI processing is battery-intensive)
- Restart app if detection becomes slow

## Safety Notes

⚠️ **Important**: This is a guidance tool only. In real emergencies:

1. Call 911 immediately
2. Follow proper CPR training
3. Use this tool as supplementary guidance only
4. Always prioritize professional medical help

## Future Enhancements

- Compression depth detection
- Multiple person detection
- Voice-guided instructions
- Integration with emergency services
- Offline model support
- Advanced hand tracking
