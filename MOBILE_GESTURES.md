# Mobile Gesture Support Documentation

## Overview
This feature adds mobile-specific gesture support to enhance the user experience on touch devices. Users can now navigate the application using intuitive swipe gestures and double-tap actions.

## Features

### 1. Swipe Gestures
- **Swipe Left/Right**: Switch to the next user in matching mode
- **Swipe Up/Down**: Toggle the chat panel open/closed

### 2. Double-Tap Gesture
- **Double-tap anywhere**: Toggle the chat panel open/closed

### 3. Visual Feedback
- Haptic feedback on supported devices
- Visual confirmation messages for gesture actions
- First-time user hints that appear once

## Technical Implementation

### Core Components

#### `useMobileGestures.ts`
- Custom hook that wraps `react-swipeable` library
- Handles gesture detection and provides callbacks
- Configurable thresholds and options

#### `MobileGestureWrapper.tsx`
- React component that wraps content with gesture handlers
- Provides visual feedback and mobile detection
- Manages gesture hints for new users

#### `useMobileOptimization.ts`
- Utility hook for mobile device detection
- Provides mobile-specific optimizations
- Handles haptic feedback and responsive utilities

### Integration Points

#### Room Component (`Room.tsx`)
```tsx
<MobileGestureWrapper
  onSwipeToNextUser={handleNext}
  onToggleChat={() => setShowChat((v) => !v)}
  disabled={lobby || status !== "connected"}
>
  {/* Room content */}
</MobileGestureWrapper>
```

#### Control Bar (`ControlBar.tsx`)
- Enhanced with larger touch targets
- Mobile-friendly button sizing
- Improved tooltips with gesture hints

## Configuration

### Gesture Sensitivity
The gesture thresholds can be adjusted in `useMobileGestures.ts`:

```typescript
{
  swipeThreshold: 80,        // Minimum distance for swipe
  doubleTapThreshold: 400,   // Time window for double-tap
  preventDefaultTouchmoveEvent: false,
  trackMouse: false
}
```

### Mobile Detection
The system detects mobile devices using:
- User agent string analysis
- Touch capability detection
- Screen size heuristics

## Browser Compatibility

### Supported Browsers
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ✅ Firefox Mobile
- ✅ Edge Mobile
- ✅ Samsung Internet

### Required Features
- Touch events support
- CSS `touch-action` property
- Modern JavaScript (ES6+)

## Performance Considerations

### Optimizations
- Gesture handlers only active on mobile devices
- Passive touch event listeners where possible
- Debounced gesture recognition
- Minimal DOM manipulation

### Memory Management
- Automatic cleanup of event listeners
- Timeout management for visual feedback
- LocalStorage for user preference caching

## User Experience

### Accessibility
- Gestures complement existing button controls
- Visual feedback for all actions
- Respects user's motion preferences
- Works with screen readers

### Progressive Enhancement
- Desktop users see standard interface
- Mobile users get enhanced gesture support
- Graceful fallback if JavaScript disabled

## Customization

### Disabling Gestures
Gestures can be disabled by setting the `disabled` prop:

```tsx
<MobileGestureWrapper disabled={true}>
  {content}
</MobileGestureWrapper>
```

### Custom Gesture Handlers
New gestures can be added by extending the `MobileGestureHandlers` interface:

```typescript
interface MobileGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleClick?: () => void;
  onTap?: () => void;
  // Add new gestures here
}
```

## Testing

### Manual Testing
1. Open the application on a mobile device
2. Verify swipe left/right switches users
3. Verify swipe up/down toggles chat
4. Verify double-tap toggles chat
5. Check visual feedback appears
6. Verify haptic feedback on supported devices

### Development Testing
Use Chrome DevTools mobile simulation:
1. Open DevTools (F12)
2. Click device toolbar icon
3. Select a mobile device
4. Test gesture functionality

## Troubleshooting

### Common Issues

#### Gestures Not Working
- Check if device is detected as mobile
- Verify touch events are enabled
- Ensure gesture wrapper is properly configured

#### Performance Issues
- Reduce gesture sensitivity thresholds
- Check for memory leaks in event listeners
- Verify passive event listener usage

#### Chat Scrolling Conflicts
- Gesture wrapper uses `pan-y` touch-action
- Chat areas should be marked with `data-mobile-scrollable`
- Vertical scrolling is preserved in chat

## Future Enhancements

### Planned Features
- [ ] Pinch-to-zoom for video feeds
- [ ] Long-press context menus
- [ ] Gesture customization settings
- [ ] Multi-finger gesture support
- [ ] Voice command integration

### Potential Improvements
- [ ] Machine learning gesture recognition
- [ ] Custom gesture training
- [ ] Advanced haptic patterns
- [ ] Gesture analytics tracking

## Dependencies

### Required Packages
```json
{
  "react-swipeable": "^7.0.1"
}
```

### Peer Dependencies
- React 16.8+ (hooks support)
- TypeScript 4.0+ (optional but recommended)

## Contributing

When adding new mobile features:
1. Test on real devices, not just simulators
2. Consider accessibility implications
3. Follow existing code patterns
4. Update this documentation
5. Add proper TypeScript types
6. Include performance considerations

## References

- [React Swipeable Documentation](https://github.com/FormidableLabs/react-swipeable)
- [Touch Events Web API](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Mobile Web Best Practices](https://web.dev/mobile/)
- [Haptic Feedback API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)