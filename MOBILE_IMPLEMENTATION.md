# 📱 Mobile-First Implementation Guide

## Quick Wins - Apply to All Pages

### 1. Container Padding
```tsx
// Before:
<div className="container mx-auto px-6 py-8">

// After:
<div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8">
```

### 2. Grid Layouts
```tsx
// 2 columns
grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4

// 3 columns  
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4

// 4 columns
grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4
```

### 3. Typography
```tsx
// Headings
text-2xl sm:text-3xl lg:text-4xl  // h1
text-xl sm:text-2xl lg:text-3xl   // h2
text-lg sm:text-xl                // h3

// Body text
text-sm md:text-base              // normal
text-xs sm:text-sm                // small
```

### 4. Spacing
```tsx
// Sections
space-y-4 md:space-y-6

// Stacks
space-y-2 sm:space-y-3 md:space-y-4

// Inline gaps
gap-2 sm:gap-3 md:gap-4
```

### 5. Buttons & Touch Targets
```tsx
// Regular buttons
className="min-h-[44px] px-4 text-sm sm:text-base"

// Icon buttons
className="h-10 w-10 sm:h-11 sm:w-11"
```

### 6. Cards
```tsx
// Padding
p-3 sm:p-4 md:p-6

// Content spacing
space-y-3 sm:space-y-4 md:space-y-6
```

### 7. Tables → Cards on Mobile
```tsx
{/* Desktop table */}
<Table className="hidden md:table">
  ...
</Table>

{/* Mobile cards */}
<div className="md:hidden space-y-3">
  {items.map(item => (
    <Card key={item.id} className="p-3 sm:p-4">
      ...
    </Card>
  ))}
</div>
```

### 8. Tabs
```tsx
<TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
  <TabsTrigger className="text-xs sm:text-sm">...</TabsTrigger>
</TabsList>
```

### 9. Dialogs
```tsx
<DialogContent className="w-[95vw] sm:max-w-lg md:max-w-xl">
```

### 10. Forms
```tsx
<div className="space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>...</div>
    <div>...</div>
  </div>
</div>
```

## Page-Specific Patterns

### Dashboard Pages
```tsx
<div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8">
  {/* KPI Grid */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <Card className="p-3 sm:p-4 md:p-6">
      <div className="text-xs sm:text-sm text-muted-foreground">Label</div>
      <div className="text-xl sm:text-2xl md:text-3xl font-bold">Value</div>
    </Card>
  </div>
</div>
```

### List/Table Pages
```tsx
<div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8">
  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
    <Input className="flex-1" />
    <Select />
  </div>

  {/* Desktop Table */}
  <div className="hidden md:block">
    <Table>...</Table>
  </div>

  {/* Mobile Cards */}
  <div className="md:hidden space-y-3">
    {items.map(...)}
  </div>
</div>
```

### Form Pages
```tsx
<div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-2xl">
  <Card className="p-4 sm:p-6">
    <form className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ...
      </div>
      <Button className="w-full sm:w-auto min-h-[44px]">
        Submit
      </Button>
    </form>
  </Card>
</div>
```

## Component-Specific Fixes

### MobileBottomNav
Already good! ✅

### AppSidebar
Already hidden on mobile! ✅

### AppHeader
Already responsive! ✅

### Tables
Need cards alternative on mobile

### Charts
Add responsive container and sizing

## Priority Files to Update

1. ✅ **src/pages/hr/HRDashboardPage.tsx** - Partially done
2. **src/pages/DashboardHR.tsx** - Partially done
3. **src/pages/hr/EmployeesPage.tsx**
4. **src/pages/hr/EmployeeDetailPage.tsx**
5. **src/pages/DepartmentsPage.tsx** 
6. **src/pages/GebruikersbeheerPage.tsx**
7. **src/pages/CalendarPage.tsx**
8. **src/pages/PlanningPage.tsx**
9. **src/pages/WorkflowBuilder.tsx**
10. **src/pages/WorkflowExecutions.tsx**

## Testing Commands

```bash
# Run dev server
npm run dev

# Test on mobile device
# 1. Find your IP: ipconfig (Windows) / ifconfig (Mac)
# 2. Access: http://YOUR_IP:5173
# 3. Or use Chrome DevTools mobile emulation
```

## Browser DevTools Testing

1. Open Chrome DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Test these devices:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - Samsung Galaxy S20 (360px)
   - iPad (768px)
   - iPad Pro (1024px)

## Checklist

- [ ] All containers use responsive padding
- [ ] All grids are responsive
- [ ] All text sizes scale
- [ ] Buttons meet touch target size (44x44px)
- [ ] Tables have mobile card alternative
- [ ] Forms stack on mobile
- [ ] Dialogs fit mobile screens
- [ ] Bottom nav doesn't overlap content (pb-20 md:pb-0)
- [ ] Images are responsive
- [ ] No horizontal scrolling on mobile
