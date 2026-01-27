# Interactions Vertalingen Check

## Gevonden in code maar ONTBREKEN in translations:

### AddInteractionDialog.tsx:
- `t('interactions.direction')` → ✅ Aanwezig
- `t('interactions.outbound')` → ✅ Aanwezig (direction.outbound)
- `t('interactions.inbound')` → ✅ Aanwezig (direction.inbound)
- `t('interactions.subjectPlaceholder')` → ❌ ONTBREEKT
- `t('interactions.subjectRequired')` → ❌ ONTBREEKT
- `t('interactions.descriptionPlaceholder')` → ❌ ONTBREEKT
- `t('interactions.duration')` → ❌ ONTBREEKT
- `t('interactions.scheduledAt')` → ❌ ONTBREEKT
- `t('interactions.makeTask')` → ❌ ONTBREEKT
- `t('interactions.dueDate')` → ❌ ONTBREEKT

### Hardcoded teksten:
- "Duration" in InteractionDetailDialog line 260: "minuten" → moet t() gebruiken

## Te checken:
- InteractionTimeline.tsx
- InteractionCard.tsx
- InteractionItem.tsx
- InteractionDetailDialog.tsx
