# 📱 Mobile UX Features Implementation

## Overzicht

Deze implementatie voegt native-feel mobile interacties toe aan de CRM web app.

## 🎯 Geïmplementeerde Features

### 1. Haptic Feedback (Android)

**Locatie:** `src/lib/haptics.ts`

Vibratie feedback op belangrijke interacties:
- ✅ **Success pattern**: Bij succesvol aanmaken/bijwerken (contacts, companies, projects, quotes)
- ✅ **Error pattern**: Bij foutmeldingen  
- ✅ **Warning pattern**: Bij swipe-to-delete acties
- ✅ **Light/Medium/Heavy**: Beschikbaar voor custom gebruik

**Respects:**
- ✅ Vibration API ondersteuning check
- ✅ `prefers-reduced-motion` user preference
- ✅ Graceful degradation als vibration niet beschikbaar

**Gebruik:**
```typescript
import { haptics } from '@/lib/haptics';

// Bij button click
onClick={() => {
  haptics.light();
  handleAction();
}}

// Bij form submit success
onSuccess={() => {
  haptics.success();
  toast.success('Opgeslagen!');
}}

// Bij delete actie
onDelete={() => {
  haptics.warning();
  confirmDelete();
}}
```

**Geïntegreerd in:**
- ✅ `useContactMutations` - create/update/delete
- ✅ `useCompanyMutations` - create/update/delete (partial)
- ✅ `useProjectMutations` - create (partial)
- ✅ `useQuoteMutations` - create (partial)
- ✅ `SwipeableCard` - swipe actions

### 2. Bottom Sheet Modals

**Locatie:** `src/components/ui/bottom-sheet.tsx`

Native-feel drawer component voor mobile met vaul library:
- ✅ Swipe-to-close met drag handle
- ✅ Backdrop overlay
- ✅ Snap points support (300px, 500px, fullscreen)
- ✅ Structured subcomponents (Header, Title, Description, Footer)

**Subcomponents:**
- `BottomSheet` - Main wrapper component
- `BottomSheetHeader` - Header section met border
- `BottomSheetTitle` - Title element
- `BottomSheetDescription` - Description text
- `BottomSheetFooter` - Footer section met border

**Gebruik:**
```tsx
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';

function MobileActionSheet() {
  const [open, setOpen] = useState(false);
  
  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetHeader>
        <BottomSheetTitle>Kies een actie</BottomSheetTitle>
        <BottomSheetDescription>
          Selecteer wat je wilt doen met dit item
        </BottomSheetDescription>
      </BottomSheetHeader>
      
      <div className="space-y-2">
        <Button variant="outline" fullWidth>Bewerken</Button>
        <Button variant="outline" fullWidth>Delen</Button>
      </div>
      
      <BottomSheetFooter>
        <Button variant="destructive" fullWidth>Verwijderen</Button>
      </BottomSheetFooter>
    </BottomSheet>
  );
}
```

**Integratie suggesties:**
- Vervang mobile dialogs met BottomSheet op breakpoint < 768px
- Gebruik voor action menus, filters, quick actions
- Ideaal voor forms op mobile (beter UX dan fullscreen dialog)

### 3. Swipe-to-Delete

**Locatie:** `src/components/ui/swipeable-card.tsx` (bestaand, updated)

Swipe gestures met haptic feedback:
- ✅ Swipe left → warning haptic + delete action
- ✅ Swipe right → success haptic + approve action  
- ✅ Framer Motion animaties
- ✅ Visual feedback (colored backgrounds)
- ✅ Threshold-based completion

**Gebruik:**
Bestaande SwipeableCard component werkt al met custom left/right actions.

---

## 📦 Dependencies Geïnstalleerd

```json
{
  "vaul": "^latest",
  "@react-spring/web": "^latest",
  "@use-gesture/react": "^latest"
}
```

---

## 🧪 Testing Checklist

### Haptic Feedback
- [ ] Open app op Android device
- [ ] Test create contact → lichte success vibratie
- [ ] Test delete action → waarschuwing vibratie patroon
- [ ] Test form validation error → error vibratie
- [ ] Verify geen vibratie op iOS (expected behavior)
- [ ] Verify geen vibratie met prefers-reduced-motion enabled

### Bottom Sheet
- [ ] Open BottomSheet component op mobile
- [ ] Swipe handle omhoog/omlaag werkt
- [ ] Backdrop click sluit sheet
- [ ] Snap points werken (300px, 500px, fullscreen)
- [ ] Content scrollt binnen sheet
- [ ] Keyboard handling correct

### Swipe-to-Delete
- [ ] Swipe card naar links → delete achtergrond zichtbaar
- [ ] Swipe voorbij threshold → item verwijderd + haptic
- [ ] Swipe en release voor threshold → card terug
- [ ] Swipe naar rechts werkt (indien enabled)

---

## 🎨 Mobile Device Support

| Feature | iOS Safari | Android Chrome | Desktop |
|---------|------------|----------------|---------|
| **Haptic feedback** | ❌ (Vibration API niet supported) | ✅ | ❌ |
| **Bottom sheet** | ✅ | ✅ | ✅ (werkt als drawer) |
| **Swipe gestures** | ✅ | ✅ | ✅ (werkt met mouse drag) |
| **Respects reduced motion** | ✅ | ✅ | ✅ |

---

## 🚀 Next Steps (Suggesties)

### Haptics Uitbreiden
- [ ] Add haptics to button component (`src/components/ui/button.tsx`)
- [ ] Add light haptic to all tab switches
- [ ] Add medium haptic to navigation changes
- [ ] Add haptic to pull-to-refresh (if implemented)

### Bottom Sheet Integratie
- [ ] Replace mobile filters with BottomSheet
- [ ] Use BottomSheet for QuickActions menus
- [ ] Use BottomSheet for mobile forms (< 768px breakpoint)
- [ ] Add BottomSheet variant to AlertDialog for mobile

### Swipe Gestures
- [ ] Add swipe-to-call on contact cards (swipe right)
- [ ] Add swipe-to-email on contact cards
- [ ] Add swipe-to-archive on interactions
- [ ] Add pull-to-refresh on list pages

### Performance
- [ ] Lazy load @react-spring/web (code splitting)
- [ ] Lazy load vaul (code splitting)  
- [ ] Add service worker for offline haptics

---

## 📚 Documentation

### Haptics API
```typescript
// Available patterns
haptics.light()    // 10ms
haptics.medium()   // 20ms  
haptics.heavy()    // 30ms
haptics.success()  // 10-50-10ms pattern
haptics.warning()  // 20-50-20ms pattern
haptics.error()    // 30-50-30-50-30ms pattern

// Or use triggerHaptic
triggerHaptic('success')
```

### BottomSheet Props
```typescript
interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[]; // Default: ['300px', '500px', 1]
}
```

---

## 🐛 Known Issues & Limitations

1. **Haptics op iOS**: Vibration API niet supported door Safari
   - Solution: iOS heeft eigen Haptic Feedback API, maar niet toegankelijk via web
   - Workaround: Silent fallback (geen error, gewoon skip)

2. **Bottom Sheet z-index**: Mogelijk conflicten met andere overlays
   - Solution: z-50 gebruikt, verify met andere modals

3. **Swipe conflicts**: Kan conflicteren met page scroll
   - Solution: `touchAction: 'pan-y'` forces vertical scroll only

---

## ✅ Completed Implementation Summary

**Files Created:**
- ✅ `src/lib/haptics.ts` - Haptic feedback utility
- ✅ `src/components/ui/bottom-sheet.tsx` - Bottom sheet component

**Files Modified:**
- ✅ `src/components/ui/swipeable-card.tsx` - Added haptic feedback
- ✅ `src/features/contacts/hooks/useContactMutations.ts` - Added haptics
- ✅ `src/features/companies/hooks/useCompanyMutations.ts` - Added haptics (partial)
- ✅ `src/features/projects/hooks/useProjectMutations.ts` - Added haptics (partial)
- ✅ `src/features/quotes/hooks/useQuoteMutations.ts` - Added haptics (partial)

**Dependencies Installed:**
- ✅ vaul (bottom sheets)
- ✅ @react-spring/web (animations)
- ✅ @use-gesture/react (gesture handling)

**Status:** ✅ **Ready for testing**
