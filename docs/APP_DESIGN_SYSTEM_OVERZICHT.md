# App Design System Overzicht 🎨

## Samenvatting
Volledige visuele identiteit en opmaak-specificaties van de Dirq HR/Verzuim Management applicatie. Deze analyse geeft een compleet beeld van alle design tokens, kleurenschema's, schaduwen, typografie, spacing, animaties en component styling patronen.

---

## 📋 Inhoudsopgave
1. [Kleurenpallet](#1-kleurenpallet)
2. [Schaduwen & Depth](#2-schaduwen--depth)
3. [Typografie](#3-typografie)
4. [Border Radius & Spacing](#4-border-radius--spacing)
5. [Component Styling](#5-component-styling)
6. [Animaties & Transities](#6-animaties--transities)
7. [Responsive Design](#7-responsive-design)
8. [Dark Mode](#8-dark-mode)
9. [Gradients & Special Effects](#9-gradients--special-effects)
10. [Mobile Optimalisaties](#10-mobile-optimalisaties)

---

## 1. Kleurenpallet

### 🎨 Primary Color (Hoofdkleur)
**Teal/Aqua Blue (#06BDC7)**
```css
--primary: 183 94% 40%;
--primary-foreground: 0 0% 100%;
```
- **Gebruik**: CTA buttons, active states, focus indicators, links
- **HSL**: hsl(183, 94%, 40%)
- **RGB**: #06BDC7
- **Kenmerken**: Modern, professioneel, energiek
- **Hover state**: bg-primary/90 (90% opacity)

### 🌙 Secondary Color (Accent kleur)
**Dark Navy (#0F172A)**
```css
--secondary: 222 47% 11%;
--secondary-foreground: 0 0% 100%;
```
- **Gebruik**: Headers, sidebar backgrounds, text emphasis
- **HSL**: hsl(222, 47%, 11%)
- **RGB**: #0F172A
- **Kenmerken**: Autoritair, stabiel, contrast met primary

### 🟢 Success Color
**Green (#22C55E)**
```css
--success: 142 71% 45%;
--success-foreground: 144 61% 20%;
```
- **Gebruik**: Success states, "Actief" status, positive metrics, completion indicators
- **RGB**: #22C55E

### 🟡 Warning Color
**Amber/Yellow (#F59E0B)**
```css
--warning: 38 92% 50%;
--warning-foreground: 48 96% 89%;
```
- **Gebruik**: Warning badges, "In behandeling" status, attention indicators
- **RGB**: #F59E0B

### 🔴 Destructive/Error Color
**Red (#EF4444)**
```css
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;
```
- **Gebruik**: Error messages, "Ziek" status, delete actions, critical alerts
- **RGB**: #EF4444

### 🎨 Background & Surface Colors

#### Light Mode
```css
--background: 210 20% 98%;        /* #F8FAFC - Very light blue-gray */
--foreground: 222 47% 11%;        /* #0F172A - Dark navy text */
--card: 0 0% 100%;                /* #FFFFFF - Pure white */
--card-foreground: 222 47% 11%;   /* #0F172A */
```

#### Muted Colors (Subtle backgrounds)
```css
--muted: 210 20% 96%;             /* #F1F5F9 - Light gray */
--muted-foreground: 215 16% 47%;  /* #64748B - Medium gray text */
```

#### Accent Color (Light teal voor hover states)
```css
--accent: 183 60% 95%;            /* #E6FAFB - Very light teal */
--accent-foreground: 183 94% 30%; /* Darker teal for text */
```

### 🖌️ Border Colors
```css
--border: 214 32% 91%;            /* #E2E8F0 - Light gray border */
--input: 214 32% 91%;             /* Same as border */
--ring: 183 94% 40%;              /* Primary color for focus rings */
```

### 📊 Sidebar Specific Colors (Light Mode)
```css
--sidebar-background: 0 0% 100%;          /* White */
--sidebar-foreground: 222 47% 11%;        /* Dark navy */
--sidebar-primary: 183 94% 40%;           /* Teal */
--sidebar-primary-foreground: 0 0% 100%;  /* White */
--sidebar-accent: 183 60% 95%;            /* Light teal */
--sidebar-accent-foreground: 183 94% 30%; /* Dark teal */
--sidebar-border: 214 32% 91%;            /* Light gray */
--sidebar-ring: 183 94% 40%;              /* Teal focus */
```

### 🎯 Status Colors (Custom gebruikt in componenten)
```css
/* Present/Actief */
.bg-green-100 .text-green-800 .border-green-200

/* Sick/Ziek */
.bg-red-100 .text-red-800 .border-red-200

/* Leave/Verlof */
.bg-blue-100 .text-blue-800 .border-blue-200

/* Sollicitant */
.bg-purple-50 .text-purple-700 .border-purple-200

/* Uit dienst */
.bg-muted .text-muted-foreground
```

### 🌈 Document Category Colors
```ts
const categoryColors = {
  arbeidscontract: 'bg-blue-500',    // #3B82F6
  medisch: 'bg-red-500',             // #EF4444
  training: 'bg-green-500',          // #22C55E
  persoonlijk: 'bg-purple-500',      // #A855F7
  factuur: 'bg-yellow-500',          // #EAB308
  overig: 'bg-gray-500',             // #6B7280
};
```

---

## 2. Schaduwen & Depth

### 💫 Shadow System
De app gebruikt een consistent shadow system voor depth en hierarchy:

```css
/* Soft Shadow - Subtiel voor kleine cards */
--shadow-soft: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
.shadow-soft { box-shadow: var(--shadow-soft); }

/* Card Shadow - Standard voor cards en panels */
--shadow-card: 0 8px 30px -4px rgba(15, 23, 42, 0.1);
.shadow-card { box-shadow: var(--shadow-card); }

/* Glow Effect - Voor primary color emphasis */
--shadow-glow: 0 0 40px rgba(6, 189, 199, 0.2);
.shadow-glow { box-shadow: var(--shadow-glow); }
```

### 📦 Legacy Shadow Classes (backwards compatibility)
```css
.shadow-dirq    → --shadow-soft
.shadow-dirq-md → --shadow-card
.shadow-dirq-lg → --shadow-card
```

### 🎭 Shadow Usage Matrix

| Component | Shadow Class | Gebruik |
|-----------|-------------|---------|
| KPI Cards | `shadow-soft` | Subtiele elevation |
| Main Cards | `shadow-card` | Standard elevation |
| Modals/Dialogs | `shadow-card` | Floating panels |
| Hover states | `hover:shadow-lg` | Interactive feedback |
| Primary CTA | `shadow-glow` | Extra attention |
| Dropdowns | Tailwind `shadow-lg` | Elevated menus |

### 🌑 Dark Mode Shadows
```css
.dark {
  --shadow-soft: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 8px 30px -4px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 40px rgba(6, 189, 199, 0.15);
}
```
**Note**: Shadows worden donkerder en intensiever in dark mode voor betere contrast.

---

## 3. Typografie

### 🔤 Font Families

```css
/* Body Text - Inter */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
/* Features: cv02, cv03, cv04, cv11 (ligatures & stylistic sets) */

/* Headings - Sora */
font-family: 'Sora', system-ui, sans-serif;
```

**Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
```

### 📏 Font Weights
```css
Sora (Headings):     300, 400, 500, 600, 700
Inter (Body):        300, 400, 500, 600
```

### 📐 Type Scale & Styling

#### Headings
```css
h1, h2, h3, h4, h5, h6 {
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600; /* semibold */
  letter-spacing: -0.025em; /* tracking-tight */
}
```

#### Responsive Typography Classes
```typescript
// Van src/lib/responsive.ts
export const headingClasses = {
  h1: "text-2xl sm:text-3xl lg:text-4xl font-bold",
  h2: "text-xl sm:text-2xl lg:text-3xl font-semibold",
  h3: "text-lg sm:text-xl lg:text-2xl font-semibold",
  h4: "text-base sm:text-lg lg:text-xl font-semibold",
};

export const textClasses = {
  base: "text-sm md:text-base",      // 14px → 16px
  small: "text-xs sm:text-sm",       // 12px → 14px
  large: "text-base sm:text-lg",     // 16px → 18px
};
```

#### Font Sizes (Tailwind classes)
```css
text-xs:   0.75rem   (12px)
text-sm:   0.875rem  (14px)   ← Body text
text-base: 1rem      (16px)   ← Default
text-lg:   1.125rem  (18px)
text-xl:   1.25rem   (20px)
text-2xl:  1.5rem    (24px)   ← Card titles
text-3xl:  1.875rem  (30px)   ← KPI values
text-4xl:  2.25rem   (36px)
```

### 🎯 Typography Patterns

#### KPI Card
```tsx
<p className="text-sm font-medium">Label</p>
<div className="text-2xl font-bold">{value}</div>
<p className="text-xs text-muted-foreground mt-1">Subtitle</p>
```

#### Card Header
```tsx
<CardTitle className="text-base font-semibold">Title</CardTitle>
<CardDescription className="text-sm text-muted-foreground">
  Description
</CardDescription>
```

#### Table Headers
```tsx
<th className="font-semibold text-sm text-foreground/80 py-3 px-4">
  Column Name
</th>
```

### 📱 Mobile Typography
```css
@media (max-width: 767px) {
  html {
    font-size: 16px; /* Never below 16px to prevent zoom on iOS */
  }
  
  input, select, textarea {
    font-size: 16px; /* Prevent zoom on focus */
  }
}
```

---

## 4. Border Radius & Spacing

### 🔘 Border Radius System

```css
--radius: 0.75rem; /* 12px - Base radius */

/* Tailwind extensions */
borderRadius: {
  lg: 'var(--radius)',           /* 12px */
  md: 'calc(var(--radius) - 2px)', /* 10px */
  sm: 'calc(var(--radius) - 4px)', /* 8px */
}
```

#### Radius Usage
```tsx
/* Cards */
.rounded-lg    → 12px (standard)
.rounded-xl    → 16px (larger cards, bento boxes)

/* Buttons */
.rounded-md    → 10px

/* Badges */
.rounded-full  → Fully rounded

/* Inputs */
.rounded-md    → 10px

/* Small elements (icons, avatars) */
.rounded-md    → 10px
.rounded-lg    → 12px
```

### 📏 Spacing Scale (Tailwind Default)

```css
/* Rem-based spacing */
0:     0
1:     0.25rem  (4px)
2:     0.5rem   (8px)
3:     0.75rem  (12px)
4:     1rem     (16px)
5:     1.25rem  (20px)
6:     1.5rem   (24px)
8:     2rem     (32px)
10:    2.5rem   (40px)
12:    3rem     (48px)
16:    4rem     (64px)
```

### 🎯 Spacing Patterns

#### Card Padding
```typescript
// Van src/lib/responsive.ts
export const cardClasses = {
  padding: "p-3 sm:p-4 md:p-6",     // 12px → 16px → 24px
  gap: "space-y-3 sm:space-y-4 md:space-y-6",
};
```

#### Component Spacing
```tsx
/* Card content */
.p-4       → Mobiel (16px)
.p-6       → Desktop (24px)

/* Gaps tussen elementen */
.gap-2     → 8px (tight)
.gap-3     → 12px (comfortable)
.gap-4     → 16px (spacious)

/* Vertical stacking */
.space-y-2 → 8px tussen children
.space-y-4 → 16px tussen children
.space-y-6 → 24px tussen secties
```

#### Touch Targets (Mobile)
```css
@media (max-width: 767px) {
  button, a, [role="button"] {
    min-height: 44px;  /* Apple HIG minimum */
    min-width: 44px;
  }
  
  /* Icon-only buttons */
  .icon-button {
    min-height: 44px;
    min-width: 44px;
    padding: 10px;
  }
}
```

---

## 5. Component Styling

### 🔘 Button Variants

```tsx
// Van src/components/ui/button.tsx
const buttonVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  },
  size: {
    default: "h-10 px-4 py-2",     // 40px height
    sm: "h-9 rounded-md px-3",     // 36px height
    lg: "h-11 rounded-md px-8",    // 44px height
    icon: "h-10 w-10",             // Square button
  },
}
```

#### Button Usage Matrix

| Variant | Gebruik | Voorbeeld |
|---------|---------|-----------|
| `default` | Primary actions | "Opslaan", "Toevoegen" |
| `destructive` | Delete, remove | "Verwijderen" |
| `outline` | Secondary actions | "Annuleren", "Terug" |
| `secondary` | Tertiary actions | Alternative option |
| `ghost` | Subtle actions | Icon buttons, menu items |
| `link` | Text links | Navigation links |

### 🏷️ Badge Variants

```tsx
// Van src/components/ui/badge.tsx
const badgeVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border",
  },
}
```

#### Status Badge Examples
```tsx
/* Success/Actief */
<Badge className="bg-success text-success-foreground">Actief</Badge>

/* Warning/In behandeling */
<Badge variant="secondary" className="gap-1">
  <Clock className="h-3 w-3" />
  In behandeling
</Badge>

/* Error/Afgewezen */
<Badge variant="destructive">Afgewezen</Badge>

/* Custom status */
<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
  Sollicitant
</Badge>
```

### 📦 Card Styling

```tsx
/* Standard Card */
<Card className="hover:shadow-card transition-shadow duration-300">
  <CardHeader>
    <CardTitle className="text-base font-semibold">Title</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-4 sm:p-6">
    Content
  </CardContent>
</Card>

/* Interactive Card (Desktop) */
.card-interactive {
  @apply transition-all duration-300 
         hover:shadow-lg 
         hover:-translate-y-1 
         hover:border-primary/20;
}
```

### 🎨 Alert Component

```tsx
// Van src/components/ui/alert.tsx
const alertVariants = {
  variant: {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
  },
}

/* Usage */
<Alert className="border-green-500 bg-green-50">
  <CheckCircle2 className="h-4 w-4 text-green-600" />
  <AlertDescription className="text-green-800">
    Success message
  </AlertDescription>
</Alert>
```

### 📊 Table Styling

```tsx
/* Professional Table */
.table-professional {
  @apply rounded-lg overflow-hidden border border-border;
}

.table-professional thead {
  @apply bg-muted/50 sticky top-0 z-10;
}

.table-professional th {
  @apply font-semibold text-sm text-foreground/80 py-3 px-4;
}

.table-professional tbody tr {
  @apply border-t border-border 
         transition-colors 
         hover:bg-muted/30 
         cursor-pointer;
}
```

### 🎯 Sidebar Menu Button

```tsx
// Van src/components/ui/sidebar.tsx
const sidebarMenuButtonVariants = {
  variant: {
    default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent",
  },
  size: {
    default: "h-8 text-sm",
    sm: "h-7 text-xs",
    lg: "h-12 text-sm",
  },
}

/* Active state */
data-[active=true]:bg-sidebar-accent 
data-[active=true]:font-medium 
data-[active=true]:text-sidebar-accent-foreground
```

### 🔘 Input Fields

```css
/* Standard Input */
.h-10 
.bg-background 
.border 
.border-input 
.rounded-md 
.px-3 
.py-2
.focus-visible:ring-2 
.focus-visible:ring-ring 
.focus-visible:ring-offset-2

/* Mobile: Always 16px to prevent zoom */
@media (max-width: 767px) {
  input, select, textarea {
    font-size: 16px;
  }
}
```

---

## 6. Animaties & Transities

### ⚡ Global Transitions

```css
/* Smooth theme transitions voor alle elementen */
*,
*::before,
*::after {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Body transitions */
body {
  transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), 
              color 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 🎬 Custom Animations

```typescript
// Van tailwind.config.ts
keyframes: {
  'fade-in': {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'slide-in': {
    '0%': { opacity: '0', transform: 'translateX(-10px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
},
animation: {
  'fade-in': 'fade-in 0.3s ease-out',
  'slide-in': 'slide-in 0.3s ease-out',
}
```

### 📱 Side Panel Animations

```css
/* Slide in from right */
.side-panel-enter {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Slide out to right */
.side-panel-exit {
  animation: slideOutRight 0.3s ease-in;
}
```

### 💫 Hover Animations

```tsx
/* Card hover (Desktop only) */
@media (min-width: 1024px) {
  .card-interactive {
    transition: all 0.3s ease;
  }
  .card-interactive:hover {
    transform: translateY(-0.25rem); /* -4px lift */
    box-shadow: var(--shadow-card);
    border-color: hsl(var(--primary) / 0.2);
  }
}

/* Button hover */
.transition-colors /* Built into buttonVariants */

/* Sidebar navigation hover */
.sidebar-desktop nav a {
  transition: all 0.2s ease;
}
.sidebar-desktop nav a:hover {
  transform: translateX(0.25rem); /* 4px right */
}
```

### 🔄 Loading Animations

```css
/* Spin (already in Tailwind) */
.animate-spin {
  animation: spin 1s linear infinite;
}

/* Pulse */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Shimmer effect voor skeleton screens */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton-shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(
    to right,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 20%,
    hsl(var(--muted)) 40%,
    hsl(var(--muted)) 100%
  );
  background-size: 1000px 100%;
}
```

### ⏱️ Duration Standards

```typescript
200ms  → Theme transitions, color changes
300ms  → Card hover, panel slides, fade-ins
500ms  → Sheet/Dialog open animations
2s     → Shimmer loading effect
```

---

## 7. Responsive Design

### 📱 Breakpoints (Tailwind Default)

```css
sm:  640px   /* Tablet portrait */
md:  768px   /* Tablet landscape */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### 🎯 Mobile-First Patterns

```tsx
/* Grid responsiveness */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

/* Padding responsiveness */
<div className="p-3 sm:p-4 md:p-6">
  {/* Content */}
</div>

/* Typography responsiveness */
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Heading
</h1>

/* Hide on mobile */
<div className="hidden md:block">Desktop only</div>

/* Show only on mobile */
<div className="block md:hidden">Mobile only</div>
```

### 📊 Component Responsive Behavior

#### Sidebar
```tsx
/* Desktop: Fixed sidebar (256px) */
@media (min-width: 1024px) {
  .sidebar-desktop {
    width: 16rem; /* 256px */
    position: fixed;
  }
}

/* Mobile: Sheet overlay (288px) */
@media (max-width: 1023px) {
  /* Uses Sheet component, slides from left */
  width: 18rem; /* 288px */
}
```

#### Tables
```tsx
/* Desktop: Normal table */
<Table className="hidden md:table">...</Table>

/* Mobile: Card view */
<div className="md:hidden space-y-4">
  {data.map(item => (
    <Card>...</Card>
  ))}
</div>
```

#### Modals/Dialogs
```css
@media (max-width: 767px) {
  [role="dialog"]:not(.no-fullscreen-mobile) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 100vw;
    max-height: 100vh;
    margin: 0;
    border-radius: 0; /* Full screen on mobile */
  }
}
```

### 🎨 Bento Grid (Desktop)

```css
@media (min-width: 1024px) {
  .bento-grid {
    display: grid;
    gap: 1rem;
    grid-auto-rows: 1fr;
  }

  .bento-card {
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid;
    background: linear-gradient(to bottom right, ...);
    transition: all 0.3s ease;
  }

  .bento-card:hover {
    box-shadow: var(--shadow-card);
    transform: translateY(-0.125rem);
  }
}
```

---

## 8. Dark Mode

### 🌙 Dark Mode Color Scheme

```css
.dark {
  /* Primary - Teal stays vibrant */
  --primary: 183 94% 45%;
  --primary-foreground: 0 0% 100%;
  
  /* Backgrounds - Dark */
  --background: 222 47% 11%;       /* #0F172A */
  --foreground: 210 20% 98%;       /* #F8FAFC */
  
  /* Card - Slightly lighter than background */
  --card: 222 40% 14%;             /* #1E293B */
  --card-foreground: 210 20% 98%;
  
  /* Accent - Darker teal */
  --accent: 183 50% 20%;
  --accent-foreground: 183 94% 70%;
  
  /* Muted */
  --muted: 222 40% 18%;
  --muted-foreground: 215 16% 65%;
  
  /* Borders - Lighter for visibility */
  --border: 222 40% 22%;
  --input: 222 40% 22%;
  --ring: 183 94% 45%;

  /* Sidebar Dark */
  --sidebar-background: 222 47% 11%;
  --sidebar-foreground: 210 20% 98%;
  --sidebar-accent: 183 50% 20%;
  --sidebar-accent-foreground: 183 94% 70%;
}
```

### 🎨 Dark Mode Specifieke Aanpassingen

```tsx
/* Status badges met dark mode */
<Badge variant="outline" className="
  bg-purple-50 text-purple-700 border-purple-200
  dark:bg-purple-950 dark:text-purple-300
">
  Sollicitant
</Badge>

/* Warning badges */
<Badge className="
  text-orange-600 bg-orange-50 border-orange-200
  dark:bg-orange-950
">
  Aanbieding
</Badge>

/* Success badges */
<Badge className="
  bg-green-600 
  dark:bg-green-700
">
  Actief Contract
</Badge>
```

### 💡 Implementation

```tsx
/* Tailwind dark mode is class-based */
darkMode: ["class"],

/* Toggle dark mode */
<html className="dark">  {/* Add this class to enable */}
```

### 🌗 Dark Mode Best Practices

1. **Contrast ratios**: Minimaal 4.5:1 voor normale tekst
2. **Shadows**: Worden donkerder/intensiever in dark mode
3. **Borders**: Lichter dan in light mode voor zichtbaarheid
4. **Images**: Consider opacity: 0.9 voor minder fel
5. **Status colors**: Blijven consistent maar met aangepaste backgrounds

---

## 9. Gradients & Special Effects

### 🌈 Gradient Definitions

```css
/* Hero gradient - Dark navy gradient */
--gradient-hero: linear-gradient(
  135deg, 
  hsl(222 47% 11%) 0%, 
  hsl(222 40% 18%) 100%
);

/* Teal gradient - Primary color gradient */
--gradient-teal: linear-gradient(
  135deg, 
  hsl(183 94% 40%) 0%, 
  hsl(183 94% 32%) 100%
);
```

### 💫 Gradient Usage

```tsx
/* Hero section background */
<div className="gradient-hero">
  {/* Dark navy gradient background */}
</div>

/* Primary CTA highlight */
<Button className="gradient-teal">
  {/* Teal gradient button */}
</Button>

/* Bento card gradients */
<div className="bg-gradient-to-br from-primary/10 to-accent/5">
  {/* Subtle gradient card */}
</div>
```

### ✨ Special Effects

#### Glow Effect
```tsx
/* Primary action glow */
<Button className="shadow-glow hover:shadow-glow">
  Important Action
</Button>

/* CSS */
--shadow-glow: 0 0 40px rgba(6, 189, 199, 0.2);
```

#### Glass Morphism (Sidebar)
```tsx
@media (min-width: 1024px) {
  .sidebar-desktop {
    background-color: hsl(var(--card) / 0.95);
    backdrop-filter: blur(10px);
    supports-[backdrop-filter]: {
      background-color: hsl(var(--card) / 0.8);
    }
  }
}
```

#### Hover Glow
```tsx
/* Icon button hover met glow */
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
```

---

## 10. Mobile Optimalisaties

### 📱 Touch Optimalisaties

```css
/* Minimum touch targets */
@media (max-width: 767px) {
  button:not(.no-touch-target),
  a:not(.no-touch-target),
  [role="button"]:not(.no-touch-target) {
    min-height: 44px;  /* Apple HIG */
    min-width: 44px;
  }
}
```

### 🔤 Input Zoom Prevention (iOS)

```css
@media (max-width: 767px) {
  html {
    font-size: 16px; /* Never below 16px */
  }
  
  input:not([type="checkbox"]):not([type="radio"]),
  select,
  textarea {
    font-size: 16px; /* Prevents zoom on focus */
  }
}
```

### 📊 Mobile Table Patterns

```tsx
/* Convert table to cards */
.mobile-table-cards tbody { display: block; }
.mobile-table-cards tr {
  display: block;
  margin-bottom: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1rem;
}
.mobile-table-cards td {
  display: block;
  text-align: left;
  padding: 0.5rem 0;
  border: none;
}
.mobile-table-cards td:before {
  content: attr(data-label) ": ";
  font-weight: 600;
}
.mobile-table-cards thead { display: none; }
```

### 🌐 Safe Area Support (iOS Notch)

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}

/* Usage */
.mobile-header {
  padding-top: calc(1rem + var(--safe-area-inset-top));
}
```

### 📜 Scrolling Optimalisaties

```css
/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Touch scrolling physics (iOS) */
.scroll-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Hide scrollbars maar allow scrolling */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### 🎯 Mobile Utility Classes

```css
/* Van index.css */
@media (max-width: 767px) {
  .mobile-full { width: 100%; max-width: 100%; }
  .mobile-stack { flex-direction: column; }
  .mobile-hide { display: none; }
  .mobile-show { display: block; }
  .mobile-compact { padding: 0.5rem; }
}
```

---

## 📝 Component Cheat Sheet

### Quick Reference voor veelgebruikte patterns:

#### KPI Card
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Label</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>
```

#### Status Badge
```tsx
{/* Success */}
<Badge className="bg-success text-success-foreground gap-1">
  <CheckCircle className="h-3 w-3" />
  Goedgekeurd
</Badge>

{/* Warning */}
<Badge variant="secondary" className="gap-1">
  <Clock className="h-3 w-3" />
  In behandeling
</Badge>

{/* Error */}
<Badge variant="destructive" className="gap-1">
  <XCircle className="h-3 w-3" />
  Afgewezen
</Badge>
```

#### Interactive Card (hover effects)
```tsx
<Card className="
  transition-all duration-300
  hover:shadow-lg
  hover:-translate-y-1
  hover:border-primary/20
  cursor-pointer
">
  {/* Content */}
</Card>
```

---

## 🎯 Key Takeaways

### Design Philosophy
- **Modern & Professional**: Teal primary (#06BDC7) met dark navy (#0F172A)
- **Consistent Spacing**: 4/8/12/16/24px increments
- **Subtle Shadows**: Light, layered depth met soft/card/glow
- **Smooth Animations**: 200ms color, 300ms transforms
- **Mobile-First**: Touch targets 44px+, 16px fonts, full-screen modals

### Color Usage
- **Primary**: CTAs, active states, focus
- **Success**: Positive feedback, "Actief" status
- **Warning**: Attention items, "In behandeling"
- **Destructive**: Errors, delete actions, "Ziek" status

### Typography
- **Headings**: Sora, 600 weight, tracking-tight
- **Body**: Inter, 400/500 weight, cv02-cv11 features
- **Responsive**: sm:text-3xl lg:text-4xl pattern

### Responsive Strategy
- **Desktop**: Fixed sidebar (256px), hover effects, bento grids
- **Tablet**: Adaptive spacing, responsive grid
- **Mobile**: Sheet sidebar (288px), card layouts, full-screen modals, 44px touch targets

---

## 📚 Files Reference

### Core Design Files
```
/src/index.css                    → CSS variables, global styles
/tailwind.config.ts               → Design tokens, theme config
/src/components/ui/               → Base UI components
/src/styles/calendar-professional.css → Calendar theming
```

### Component Examples
```
/src/pages/DashboardExecutive.tsx → KPI cards, charts
/src/pages/hr/HRDashboardPage.tsx → Status badges, cards
/src/components/ui/sidebar.tsx    → Sidebar styling
/src/components/ui/button.tsx     → Button variants
/src/components/ui/badge.tsx      → Badge variants
```

---

**Document gemaakt**: {new Date().toLocaleDateString('nl-NL')}
**Versie**: 1.0
**Voor**: Dirq HR/Verzuim Management CRM Transformatie
