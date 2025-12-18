/**
 * 📱 Mobile-First Responsive Design Utilities
 * 
 * Consistent spacing and sizing voor mobile-ready components
 */

// Container padding classes
export const containerClasses = "container mx-auto px-3 sm:px-4 md:px-6";
export const containerPy = "py-3 sm:py-4 md:py-8";
export const containerPadding = `${containerClasses} ${containerPy}`;

// Grid layout classes
export const gridResponsive = {
  cols2: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
  cols3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4",
  cols4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
  cols2mobile: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3",
};

// Typography responsive classes
export const headingClasses = {
  h1: "text-2xl sm:text-3xl lg:text-4xl font-bold",
  h2: "text-xl sm:text-2xl lg:text-3xl font-semibold",
  h3: "text-lg sm:text-xl lg:text-2xl font-semibold",
  h4: "text-base sm:text-lg lg:text-xl font-semibold",
};

export const textClasses = {
  base: "text-sm md:text-base",
  small: "text-xs sm:text-sm",
  large: "text-base sm:text-lg",
};

// Card spacing
export const cardClasses = {
  padding: "p-3 sm:p-4 md:p-6",
  gap: "space-y-3 sm:space-y-4 md:space-y-6",
};

// Button sizes
export const buttonClasses = {
  touch: "min-h-[44px] px-4 text-sm sm:text-base",
  icon: "h-10 w-10 sm:h-11 sm:w-11",
};

// Spacing utilities
export const spacing = {
  section: "space-y-4 md:space-y-6",
  stack: "space-y-2 sm:space-y-3 md:space-y-4",
  inline: "gap-2 sm:gap-3 md:gap-4",
};

// Flex layouts
export const flexResponsive = {
  center: "flex items-center justify-center",
  between: "flex items-center justify-between",
  wrap: "flex flex-wrap gap-2 sm:gap-3 md:gap-4",
  col: "flex flex-col gap-3 sm:gap-4 md:gap-6",
  row: "flex flex-col sm:flex-row gap-3 sm:gap-4",
};

// Table/List responsive behavior
export const listClasses = {
  // Hide table on mobile, show cards
  desktopTable: "hidden md:table",
  mobileCards: "md:hidden space-y-3",
  // List item spacing
  item: "p-3 sm:p-4 border rounded-lg",
};

// Modal/Dialog responsive
export const dialogClasses = {
  // Full screen on mobile, centered on desktop
  content: "w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl",
  fullMobile: "fixed inset-0 sm:relative sm:rounded-lg",
};

// Touch targets (minimum 44x44px)
export const touchTarget = "min-h-[44px] min-w-[44px]";

// Safe areas for mobile (bottom nav, notch, etc.)
export const safeArea = {
  bottom: "pb-20 md:pb-0", // For bottom navigation
  top: "pt-safe",
  paddingBottom: "pb-safe",
};

// Mobile-first breakpoints for JavaScript
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Hook-like utility to check if we're on mobile
 * (Use the actual useIsMobile hook in components)
 */
export const isMobileBreakpoint = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.md;
};

/**
 * Combine responsive classes
 */
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Common page patterns
export const pagePatterns = {
  // Standard page with container
  page: `${containerPadding} ${spacing.section}`,
  // Page with cards grid
  cardsPage: `${containerPadding}`,
  cardsGrid: gridResponsive.cols3,
  // Form page
  formPage: `${containerClasses} py-4 sm:py-6 max-w-2xl`,
  // Dashboard page
  dashboard: `${containerPadding}`,
  dashboardGrid: gridResponsive.cols4,
};

// Export everything as default object too
export default {
  container: containerClasses,
  containerPadding,
  containerPy,
  grid: gridResponsive,
  heading: headingClasses,
  text: textClasses,
  card: cardClasses,
  button: buttonClasses,
  spacing,
  flex: flexResponsive,
  list: listClasses,
  dialog: dialogClasses,
  touchTarget,
  safeArea,
  breakpoints,
  patterns: pagePatterns,
};
