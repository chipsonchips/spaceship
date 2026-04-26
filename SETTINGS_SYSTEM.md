# Game Settings System Documentation

## Overview

The Aviator game now includes a comprehensive settings system that allows players to customize their gaming experience. All settings are persisted to localStorage and automatically restored on subsequent visits.

---

## Features

### Audio Settings

- **Sound Effects Toggle** - Enable/disable all game sounds
- **Volume Control** - Adjust sound volume from 0-100%

### Visual Settings

- **Particle Effects** - Toggle crash particle animations
- **Animations** - Enable/disable multiplier pulse and other animations
- **Screen Tint** - Toggle dynamic color overlay during flight

### UI Settings

- **Activity Feed** - Show/hide player activity notifications
- **Session Stats** - Show/hide session statistics widget
- **Potential Payout** - Show/hide real-time payout preview
- **Auto-Hide UI** - Automatically hide UI elements during gameplay
- **UI Scale** - Adjust UI element sizes (80% - 120%)

---

## Architecture

### SettingsContext (`frontend/context/SettingsContext.tsx`)

Central context for managing game settings across the application.

**Interface:**

```typescript
interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  particleEffectsEnabled: boolean;
  animationsEnabled: boolean;
  screenTintEnabled: boolean;
  activityFeedEnabled: boolean;
  sessionStatsEnabled: boolean;
  potentialPayoutEnabled: boolean;
  autoHideUI: boolean;
  uiScale: number;
}
```

**Hook:**

```typescript
const { settings, updateSettings, resetSettings } = useSettings();
```

**Features:**

- Automatic localStorage persistence
- SSR-safe (no hydration errors)
- Default settings fallback
- JSON serialization for storage

### SettingsModal (`frontend/components/game/SettingsModal.tsx`)

Modal dialog for adjusting game settings.

**Features:**

- Organized into 3 sections: Audio, Visual, UI
- Toggle switches for boolean settings
- Range sliders for numeric settings
- Real-time preview of changes
- Reset to defaults button
- Backdrop click to close

### SettingsButton (`frontend/components/game/SettingsButton.tsx`)

Floating button to open the settings modal.

**Features:**

- Fixed position (top-right)
- Hover effects
- Accessible title attribute
- Responsive sizing

---

## Integration Points

### Components Using Settings

1. **GameBoard.tsx**
   - `soundEnabled` - Controls crash/takeoff sounds
   - `soundVolume` - Sets audio volume
   - `particleEffectsEnabled` - Shows/hides particle effects
   - `animationsEnabled` - Controls multiplier pulse animation
   - `screenTintEnabled` - Shows/hides screen tint overlay

2. **PotentialPayout.tsx**
   - `potentialPayoutEnabled` - Shows/hides payout widget

3. **SessionStats.tsx**
   - `sessionStatsEnabled` - Shows/hides stats widget

4. **PlayerActivityFeed.tsx**
   - `activityFeedEnabled` - Shows/hides activity feed

### Root Provider Integration

SettingsProvider is added to `frontend/app/rootProvider.tsx` to ensure settings are available throughout the entire application.

---

## Usage Examples

### Accessing Settings

```typescript
import { useSettings } from "@/context/SettingsContext";

function MyComponent() {
  const { settings } = useSettings();

  if (!settings.soundEnabled) {
    // Sound is disabled
  }
}
```

### Updating Settings

```typescript
const { updateSettings } = useSettings();

// Update single setting
updateSettings({ soundVolume: 0.8 });

// Update multiple settings
updateSettings({
  soundEnabled: false,
  particleEffectsEnabled: true,
});
```

### Resetting Settings

```typescript
const { resetSettings } = useSettings();

resetSettings(); // Resets to defaults and clears localStorage
```

---

## Storage

### localStorage Key

```
aviator_game_settings
```

### Storage Format

```json
{
  "soundEnabled": true,
  "soundVolume": 0.5,
  "particleEffectsEnabled": true,
  "animationsEnabled": true,
  "screenTintEnabled": true,
  "activityFeedEnabled": true,
  "sessionStatsEnabled": true,
  "potentialPayoutEnabled": true,
  "autoHideUI": false,
  "uiScale": 1
}
```

### Persistence

- Settings are automatically saved to localStorage on every change
- Settings are loaded from localStorage on app startup
- If localStorage is unavailable, defaults are used
- Invalid stored data is ignored, defaults are used instead

---

## Default Settings

```typescript
const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  particleEffectsEnabled: true,
  animationsEnabled: true,
  screenTintEnabled: true,
  activityFeedEnabled: true,
  sessionStatsEnabled: true,
  potentialPayoutEnabled: true,
  autoHideUI: false,
  uiScale: 1,
};
```

---

## UI/UX Features

### Settings Modal

- **Organized Sections** - Audio, Visual, UI
- **Toggle Switches** - For boolean settings
- **Range Sliders** - For numeric settings with percentage display
- **Real-time Updates** - Changes apply immediately
- **Reset Button** - Confirmation dialog before reset
- **Responsive Design** - Works on all screen sizes
- **Keyboard Accessible** - Full keyboard navigation support

### Settings Button

- **Fixed Position** - Always accessible (top-right)
- **Hover Effects** - Visual feedback
- **Emoji Icon** - ⚙️ for easy recognition
- **Responsive** - Adjusts size on mobile

---

## Performance Considerations

1. **localStorage Access** - Wrapped in try-catch to handle quota exceeded
2. **SSR Safety** - No localStorage access during server-side rendering
3. **Minimal Re-renders** - Settings changes only affect relevant components
4. **Lazy Loading** - Settings modal only renders when opened

---

## Accessibility

- **Keyboard Navigation** - All controls are keyboard accessible
- **Toggle Switches** - Clear on/off states
- **Range Sliders** - Labeled with current values
- **Color Contrast** - Meets WCAG standards
- **Screen Reader Support** - Proper ARIA labels

---

## Future Enhancements

### Potential Additions

1. **Preset Configurations** - Save/load custom setting profiles
2. **Difficulty Levels** - Preset difficulty configurations
3. **Accessibility Options** - High contrast mode, larger text
4. **Performance Profiles** - Low/Medium/High quality settings
5. **Notification Preferences** - Customize alert types
6. **Keyboard Shortcuts** - Customizable hotkeys
7. **Theme Selection** - Dark/Light/Custom themes
8. **Language Selection** - Multi-language support

---

## Troubleshooting

### Settings Not Persisting

- Check if localStorage is enabled in browser
- Check browser's storage quota
- Clear browser cache and try again

### Settings Not Loading

- Check browser console for errors
- Verify localStorage key: `aviator_game_settings`
- Try resetting settings to defaults

### Performance Issues

- Disable particle effects
- Disable animations
- Reduce UI scale
- Disable activity feed

---

## File Structure

```
frontend/
├── context/
│   └── SettingsContext.tsx (new)
├── components/game/
│   ├── SettingsButton.tsx (new)
│   ├── SettingsModal.tsx (new)
│   ├── GameBoard.tsx (modified)
│   ├── PotentialPayout.tsx (modified)
│   ├── SessionStats.tsx (modified)
│   └── PlayerActivityFeed.tsx (modified)
└── app/
    └── rootProvider.tsx (modified)
```

---

## Testing Checklist

- [ ] Settings modal opens/closes correctly
- [ ] All toggles work properly
- [ ] Range sliders update values
- [ ] Settings persist after page reload
- [ ] Reset button works and shows confirmation
- [ ] Sound volume affects audio output
- [ ] Particle effects toggle works
- [ ] Animation toggle works
- [ ] Screen tint toggle works
- [ ] UI widgets show/hide correctly
- [ ] UI scale adjusts element sizes
- [ ] Settings work on mobile devices
- [ ] No console errors
- [ ] localStorage quota handling works

---

## Support

For issues or questions about the settings system, please refer to:

1. Component JSDoc comments
2. This documentation file
3. Browser console for error messages
4. localStorage inspection in DevTools
