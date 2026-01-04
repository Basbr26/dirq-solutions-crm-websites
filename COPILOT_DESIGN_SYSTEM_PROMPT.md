# 🎨 Dirq Solutions Design System - Complete Implementation Guide

## 📋 Overzicht
Deze prompt helpt je om een React + TypeScript applicatie te bouwen met **exact dezelfde look & feel** als Dirq Solutions CRM. De app gebruikt moderne technologieën en een professioneel design systeem met teal als primaire kleur.

---

## 🛠️ Tech Stack

### Core Framework
- **React 18.3.1** met TypeScript
- **Vite** als build tool (snelle HMR)
- **React Router 6.30** voor routing

### UI Framework & Styling
- **Tailwind CSS 3.4** - Utility-first CSS
- **Shadcn/ui** - High-quality React components (Radix UI basis)
- **Framer Motion** - Animaties en page transitions
- **next-themes** - Dark/Light mode support

### Data & State
- **TanStack Query (React Query)** - Server state management
- **Supabase** - Backend (PostgreSQL + Auth + Storage)
- **React Hook Form** + **Zod** - Forms & validatie

### Icons & Assets
- **Lucide React** - Modern icon library
- Custom logo component

### Logo Component
```tsx
// Logo met D in vierkant
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center">
        <span className="text-xl font-heading font-bold text-white">D</span>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-heading font-semibold text-foreground">Dirq</span>
        <span className="text-xs text-muted-foreground">Solutions CRM</span>
      </div>
    </div>
  );
}
```

---

## 🎨 Design Tokens & Kleurenschema

### Primaire Kleuren
```css
/* Primary - Teal #06BDC7 */
--primary: 183 94% 40%;
--primary-foreground: 0 0% 100%;

/* Secondary - Dark Navy #0F172A */
--secondary: 222 47% 11%;
--secondary-foreground: 0 0% 100%;
```

### Background & Surfaces
```css
/* Light Mode */
--background: 210 20% 98%;        /* #F8FAFC - Light gray */
--foreground: 222 47% 11%;        /* Dark navy text */
--card: 0 0% 100%;                /* White cards */
--card-foreground: 222 47% 11%;

/* Dark Mode */
--background: 222 47% 11%;        /* Dark navy */
--foreground: 210 20% 98%;        /* Light text */
--card: 222 40% 14%;              /* Slightly lighter navy */
--card-foreground: 210 20% 98%;
```

### Accent & States
```css
/* Accent - Light Teal */
--accent: 183 60% 95%;            /* #E6FAFB */
--accent-foreground: 183 94% 30%;

/* Muted */
--muted: 210 20% 96%;             /* #F1F5F9 */
--muted-foreground: 215 16% 47%;

/* Destructive (Errors) */
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;

/* Warning */
--warning: 38 92% 50%;
--warning-foreground: 48 96% 89%;

/* Success */
--success: 142 71% 45%;
--success-foreground: 144 61% 20%;
```

### Borders & Effects
```css
--border: 214 32% 91%;            /* Light mode borders */
--input: 214 32% 91%;
--ring: 183 94% 40%;              /* Focus ring - teal */
--radius: 0.75rem;                /* 12px - rounded corners */
```

### Shadows (Custom)
```css
--shadow-soft: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
--shadow-card: 0 8px 30px -4px rgba(15, 23, 42, 0.1);
--shadow-glow: 0 0 40px rgba(6, 189, 199, 0.2);
```

---

## 📐 Typography

### Font Stack
```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],     // Body text
  heading: ['Sora', 'system-ui', 'sans-serif']    // Headings
}
```

### Google Fonts Import
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
```

### Typography Scale
- **Headings**: Gebruik `font-heading` (Sora) met font-bold
- **Body**: Gebruik `font-sans` (Inter) met font-normal of font-medium
- **Small text**: `text-sm text-muted-foreground`

---

## 🧩 Component Patterns

### 1. Dashboard Layout
```tsx
<AppLayout>
  <div className="p-4 sm:p-6 max-w-7xl mx-auto">
    {/* Responsive padding en max-width */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Responsive grid voor metrics */}
    </div>
  </div>
</AppLayout>
```

### 2. Stat Cards (Metrics)
```tsx
<Card className="hover:shadow-card transition-shadow duration-300">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Label
        </p>
        <h3 className="text-2xl font-bold text-foreground mt-2">
          24
        </h3>
        {/* Optional badge */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-2">
          18 actief
        </span>
      </div>
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Sidebar Navigation
```tsx
<Button
  variant="ghost"
  className={cn(
    'w-full justify-start gap-3 h-10 px-3 font-normal',
    active && 'bg-primary/10 text-primary font-medium hover:bg-primary/15',
    !active && 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
  )}
>
  <Icon className="h-4 w-4" />
  <span>Label</span>
</Button>
```

### 4. Header met Search Bar & Utility Icons
```tsx
<header className="bg-card border-b border-border sticky top-0 z-50">
  <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
    <div className="flex items-center justify-between gap-4">
      {/* Logo - alleen op desktop */}
      <div className="hidden lg:block">
        <Logo />
      </div>
      
      {/* Search Bar - centered */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Zoeken"
            className="pl-10 h-10 bg-background"
          />
        </div>
      </div>
      
      {/* Utility Icons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9">
          BA
        </Button>
      </div>
    </div>
  </div>
</header>
```

### 5. Tables
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted/50">
      <TableHead className="font-semibold">Naam</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Acties</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="font-medium">Data</TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Actief
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 6. Quick Actions Card
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <Rocket className="h-5 w-5 text-primary" />
      <CardTitle className="text-lg font-semibold">Snelle Acties</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-2">
    <Button
      variant="ghost"
      className="w-full justify-between h-12 px-4 hover:bg-muted/50 group"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">Bekijk Sales Pipeline</span>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
    </Button>
    
    <Button
      variant="ghost"
      className="w-full justify-between h-12 px-4 hover:bg-muted/50 group"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Building className="h-4 w-4 text-secondary" />
        </div>
        <span className="font-medium">Beheer Klanten</span>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
    </Button>
    
    <Button
      variant="ghost"
      className="w-full justify-between h-12 px-4 hover:bg-muted/50 group"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-warning" />
        </div>
        <span className="font-medium">Nieuwe Offerte</span>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
    </Button>
  </CardContent>
</Card>
```

### 7. Pipeline Stage Cards
```tsx
<Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Search className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Prospecting</h3>
          <p className="text-sm text-muted-foreground">KVK data scrape, initial research</p>
        </div>
      </div>
      <Badge variant="secondary" className="h-6 min-w-[24px] flex items-center justify-center">
        0
      </Badge>
    </div>
    <div className="text-center py-8 text-sm text-muted-foreground">
      Sleep leads hierheen
    </div>
  </CardContent>
</Card>

{/* Andere stages met verschillende kleuren */}
<Card className="border-2 border-dashed">
  {/* Video Audit Sent - purple (purple-500) */}
  {/* Discovery Call - pink/red (rose-500) */}
  {/* Proposal Sent - yellow (yellow-500) */}
</Card>
```

### 8. Page Header met Action Button
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold text-foreground">Sales Pipeline</h1>
    <p className="text-muted-foreground">
      Dirq Websites - Beheer je leads en deals
    </p>
  </div>
  <Button className="bg-primary hover:bg-primary/90">
    <Plus className="h-4 w-4 mr-2" />
    Nieuwe Lead
  </Button>
</div>

{/* Voor andere pagina's - Teal button */}
<Button className="bg-primary hover:bg-primary/90">
  <Plus className="h-4 w-4 mr-2" />
  Nieuw Bedrijf
</Button>
```

### 9. Forms
```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">Naam</Label>
      <Input
        id="name"
        {...register('name')}
        placeholder="Voer naam in"
        className="h-10"
      />
      {errors.name && (
        <p className="text-sm text-destructive">
          {errors.name.message}
        </p>
      )}
    </div>
    
    <Button type="submit" className="w-full">
      Opslaan
    </Button>
  </div>
</form>
```

---

## 🎭 Animaties & Transitions

### Page Transitions (Framer Motion)
```tsx
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

<motion.div
  initial="initial"
  animate="enter"
  exit="exit"
  variants={pageVariants}
  transition={pageTransition}
>
  {children}
</motion.div>
```

### Hover Effects
```tsx
// Card hover
className="hover:shadow-card transition-shadow duration-300"

// Button hover - gebruik Shadcn variants
<Button variant="default">      {/* Teal background */}
<Button variant="outline">      {/* Border only */}
<Button variant="ghost">        {/* Transparent */}
<Button variant="destructive">  {/* Red */}
```

### Loading States
```tsx
// Skeleton
<Skeleton className="h-20 w-full" />

// Spinner
<div className="flex items-center justify-center p-8">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>
```

---

## 🗂️ Project Structure

```
src/
├── components/
│   ├── ui/                 # Shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/             # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   └── AppHeader.tsx
│   └── [feature]/          # Feature components
│       └── FeatureCard.tsx
├── pages/                  # Route pages
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   └── ...
├── hooks/                  # Custom hooks
│   ├── useAuth.ts
│   └── useData.ts
├── lib/                    # Utils & helpers
│   ├── utils.ts
│   └── supabase.ts
├── types/                  # TypeScript types
│   └── index.ts
├── styles/
│   └── index.css          # Tailwind + custom CSS
└── App.tsx                # Main app component
```

---

## 📦 Package.json Dependencies

### Installation Command
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app

# Core
npm install react-router-dom @tanstack/react-query

# UI
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/typography
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install framer-motion
npm install next-themes

# Forms
npm install react-hook-form @hookform/resolvers zod

# Backend
npm install @supabase/supabase-js

# Shadcn CLI
npx shadcn@latest init

# Install needed Shadcn components
npx shadcn@latest add button card input label select table tabs toast dialog dropdown-menu avatar badge skeleton
```

---

## ⚙️ Configuration Files

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
        'card': '0 8px 30px -4px rgba(15, 23, 42, 0.1)',
        'glow': '0 0 40px rgba(6, 189, 199, 0.2)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### src/index.css
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 183 94% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 222 47% 11%;
    --secondary-foreground: 0 0% 100%;
    --background: 210 20% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --accent: 183 60% 95%;
    --accent-foreground: 183 94% 30%;
    --muted: 210 20% 96%;
    --muted-foreground: 215 16% 47%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --success: 142 71% 45%;
    --success-foreground: 144 61% 20%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 183 94% 40%;
    --radius: 0.75rem;
  }

  .dark {
    --primary: 183 94% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 222 40% 18%;
    --secondary-foreground: 0 0% 100%;
    --background: 222 47% 11%;
    --foreground: 210 20% 98%;
    --card: 222 40% 14%;
    --card-foreground: 210 20% 98%;
    --popover: 222 40% 14%;
    --popover-foreground: 210 20% 98%;
    --accent: 183 50% 20%;
    --accent-foreground: 183 94% 70%;
    --muted: 222 40% 18%;
    --muted-foreground: 215 16% 65%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --warning: 48 96% 89%;
    --warning-foreground: 38 92% 50%;
    --success: 142 71% 45%;
    --success-foreground: 144 61% 20%;
    --border: 222 40% 22%;
    --input: 222 40% 22%;
    --ring: 183 94% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    @apply font-sans;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading;
  }
}
```

---

## 🚀 Quick Start Template

### Main App.tsx
```tsx
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### Example Dashboard Page
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Clock } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welkom terug! Hier is je overzicht
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Totaal Gebruikers
                  </p>
                  <h3 className="text-2xl font-bold mt-2">1,234</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Groei
                  </p>
                  <h3 className="text-2xl font-bold mt-2">+12.5%</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Actieve Sessies
                  </p>
                  <h3 className="text-2xl font-bold mt-2">89</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Design Principles

### 1. Consistent Spacing
- Gebruik Tailwind spacing scale: `gap-4`, `p-6`, `space-y-4`
- Container padding: `p-4 sm:p-6` (responsive)
- Card padding: `pt-6` voor CardContent

### 2. Responsive Design
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### 3. Color Usage
- **Primary (Teal)**: Buttons, links, active states, belangrijke accenten
- **Secondary (Navy)**: Headers, belangrijke tekst
- **Muted**: Subtiele backgrounds, labels, minder belangrijke tekst
- **Success**: Positieve acties, voltooid
- **Warning**: Waarschuwingen, pending states
- **Destructive**: Errors, delete acties

### 4. Interactive States
- Hover: Gebruik `hover:` utilities voor subtiele transitions
- Active: `bg-primary/10` voor active navigation items
- Focus: Focus ring is automatisch via `ring` color
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

### 5. Accessibility
- Gebruik Shadcn components (hebben ARIA ingebouwd)
- Labels bij alle form inputs
- Focus states altijd zichtbaar
- Color contrast ratio > 4.5:1
- Keyboard navigatie support

---

## 📱 Responsive Patterns

### Mobile Navigation
```tsx
{/* Desktop: Sidebar */}
<aside className="hidden lg:block w-64 border-r">
  <Sidebar />
</aside>

{/* Mobile: Bottom nav */}
<nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-card">
  <BottomNav />
</nav>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Auto-responsive columns */}
</div>
```

### Responsive Typography
```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
```

---

## 🔧 Utility Patterns

### CN (Class Names) Helper
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className // Allow overrides
)} />
```

### Toast Notifications
```typescript
import { toast } from "sonner";

// Success
toast.success("Opgeslagen!");

// Error
toast.error("Er ging iets mis");

// Loading
const toastId = toast.loading("Bezig met laden...");
toast.success("Klaar!", { id: toastId });
```

---

## 🎨 Advanced Patterns

### Mini Stat Cards (Horizontal Scroll)
```tsx
<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
  <Card className="min-w-[200px] shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-muted-foreground">Totaal Leads</p>
      <p className="text-3xl font-bold text-foreground mt-2">0</p>
    </CardContent>
  </Card>
  
  <Card className="min-w-[200px] shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-muted-foreground">Actief in Pipeline</p>
      <p className="text-3xl font-bold text-blue-500 mt-2">0</p>
    </CardContent>
  </Card>
  
  <Card className="min-w-[200px] shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-muted-foreground">Pipeline Waarde</p>
      <p className="text-3xl font-bold text-purple-500 mt-2">€0</p>
    </CardContent>
  </Card>
  
  <Card className="min-w-[200px] shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-muted-foreground">Actieve Klanten</p>
      <p className="text-3xl font-bold text-green-500 mt-2">0</p>
    </CardContent>
  </Card>
  
  <Card className="min-w-[200px] shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-muted-foreground">MRR</p>
      <p className="text-3xl font-bold text-green-500 mt-2">€0</p>
    </CardContent>
  </Card>
</div>

{/* Add to index.css for hiding scrollbar */}
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### Table with Filters
```tsx
<div className="space-y-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold">Bedrijven</h1>
    <Button className="bg-primary hover:bg-primary/90">
      <Plus className="h-4 w-4 mr-2" />
      Nieuw Bedrijf
    </Button>
  </div>
  <p className="text-muted-foreground">Beheer al uw bedrijven en relaties</p>
  
  {/* Filters */}
  <div className="flex items-center gap-4">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Zoeken"
        className="pl-10"
      />
    </div>
    <Select defaultValue="all">
      <SelectTrigger className="w-[180px]">
        <Filter className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Alle statussen" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alle statussen</SelectItem>
        <SelectItem value="active">Actief</SelectItem>
        <SelectItem value="inactive">Inactief</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  {/* Table */}
  <Card>
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="font-semibold">
            BEDRIJFSNAAM <ArrowUpDown className="ml-2 h-4 w-4 inline" />
          </TableHead>
          <TableHead className="font-semibold">
            SECTOR <ArrowUpDown className="ml-2 h-4 w-4 inline" />
          </TableHead>
          <TableHead>LOCATIE</TableHead>
          <TableHead>WEBSITE</TableHead>
          <TableHead>
            STATUS <ArrowUpDown className="ml-2 h-4 w-4 inline" />
          </TableHead>
          <TableHead>BRON</TableHead>
          <TableHead>
            AANGEMAAKT <ArrowDown className="ml-2 h-4 w-4 inline text-primary" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="hover:bg-muted/50">
          <TableCell className="font-medium">Administratiekantoor Bakker</TableCell>
          <TableCell>Boekhoudkantoor</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell>
            <a href="#" className="text-primary hover:underline">Website</a>
          </TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="text-muted-foreground">1 jan 2026</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</div>
```

### Version Badge (Footer)
```tsx
<div className="fixed bottom-4 left-4 text-sm text-muted-foreground">
  Dirq Solutions CRM v2.0
</div>
```

### Status Badges
```tsx
const statusConfig = {
  active: { label: "Actief", variant: "default", className: "bg-success/10 text-success" },
  pending: { label: "In behandeling", variant: "secondary", className: "bg-warning/10 text-warning" },
  inactive: { label: "Inactief", variant: "outline", className: "bg-muted" },
};

<Badge className={statusConfig[status].className}>
  {statusConfig[status].label}
</Badge>
```

### Empty States
```tsx
{/* Empty state met action */}
<div className="flex flex-col items-center justify-center p-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">Geen items gevonden</h3>
  <p className="text-sm text-muted-foreground mb-6">
    Voeg je eerste item toe om te beginnen
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Item toevoegen
  </Button>
</div>

{/* Coming soon state */}
<div className="p-8">
  <h1 className="text-3xl font-bold text-foreground mb-2">Offertes</h1>
  <p className="text-muted-foreground">Coming soon...</p>
</div>

{/* Pipeline empty state */}
<Card className="mt-6">
  <CardHeader>
    <div className="flex items-center gap-2">
      <BarChart3 className="h-5 w-5 text-primary" />
      <CardTitle>Pipeline Overzicht</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Nog geen leads in de pipeline
    </div>
  </CardContent>
</Card>
```

### Loading Skeletons
```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-lg" />
    </div>
  </CardContent>
</Card>
```

---

## 🚀 Deployment Checklist

- [ ] Run `npm run build` zonder errors
- [ ] Test dark mode op alle paginas
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Optimaliseer afbeeldingen en assets
- [ ] Check accessibility (WCAG 2.1 AA)
- [ ] Test loading states
- [ ] Implementeer error boundaries
- [ ] Setup environment variables
- [ ] Configure Supabase project
- [ ] Test alle forms en validaties

---

## 💡 Best Practices

### 1. Component Compositie
- Kleine, herbruikbare components
- Props drilling vermijden (gebruik Context/Zustand)
- Consistent naming: `{Feature}{ComponentType}` (UserCard, DashboardHeader)

### 2. Performance
- Lazy load routes: `React.lazy(() => import('./Page'))`
- Memoize expensive calculations: `useMemo`, `useCallback`
- Virtualize lange lijsten: `@tanstack/react-virtual`
- Optimize images: WebP format, responsive sizes

### 3. Code Organisatie
- Co-locate related files (component + types + styles in één folder)
- Absolute imports: `@/components` ipv `../../components`
- Consistent export pattern: named exports voor utils, default voor pages

### 4. Error Handling
```tsx
// Error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>

// Query error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: 3,
});

if (error) return <ErrorMessage error={error} />;
```

---

## 📚 Handige Voorbeelden

### Complete CRUD Form
```tsx
const schema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 karakters zijn"),
  email: z.string().email("Ongeldig email adres"),
});

function UserForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await saveUser(values);
      toast.success("Gebruiker opgeslagen");
    } catch (error) {
      toast.error("Er ging iets mis");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Naam</FormLabel>
              <FormControl>
                <Input placeholder="Jan de Vries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Opslaan</Button>
      </form>
    </Form>
  );
}
```

### Data Table met Sorting
```tsx
function DataTable({ data }: { data: User[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const sorted = useMemo(() => {
    if (!sorting.length) return data;
    return [...data].sort((a, b) => {
      const { id, desc } = sorting[0];
      if (desc) return b[id] > a[id] ? 1 : -1;
      return a[id] > b[id] ? 1 : -1;
    });
  }, [data, sorting]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            onClick={() => setSorting([{ id: 'name', desc: !sorting[0]?.desc }])}
            className="cursor-pointer hover:bg-muted/50"
          >
            Naam {sorting[0]?.id === 'name' && (sorting[0].desc ? '↓' : '↑')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(user => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 🎓 Conclusie

Met deze design system guide kun je een **professionele, moderne app** bouwen die er precies zo uitziet als Dirq Solutions CRM. De combinatie van:

- ✅ **Teal (#06BDC7)** als primary color
- ✅ **Shadcn/ui** components
- ✅ **Tailwind CSS** utility classes
- ✅ **Framer Motion** animaties
- ✅ **Dark mode** support
- ✅ **Responsive design** patterns

...zorgt voor een **consistente, professionele uitstraling** met uitstekende UX.

---

## 📞 Support & Resources

- **Shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Radix UI**: https://radix-ui.com
- **Lucide Icons**: https://lucide.dev
- **Framer Motion**: https://framer.com/motion

---

**Succes met je nieuwe app! 🚀**
