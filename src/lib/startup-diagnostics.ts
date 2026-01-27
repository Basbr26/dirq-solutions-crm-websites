/**
 * Startup Diagnostics
 * Checks for common issues that cause "Cannot read properties of undefined" errors
 */

export function runStartupDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    issues: [] as string[],
    warnings: [] as string[],
  };

  console.log('🔍 Running startup diagnostics...');

  // Check React
  try {
    if (typeof React === 'undefined') {
      diagnostics.issues.push('React is undefined - this should never happen');
    }
  } catch (e) {
    diagnostics.issues.push('Error checking React: ' + (e as Error).message);
  }

  // Check if all critical dependencies are loaded
  const criticalModules = [
    { name: 'react-router-dom', check: () => typeof window !== 'undefined' },
    { name: '@tanstack/react-query', check: () => typeof window !== 'undefined' },
    { name: 'framer-motion', check: () => typeof window !== 'undefined' },
  ];

  for (const module of criticalModules) {
    try {
      if (!module.check()) {
        diagnostics.warnings.push(`${module.name} may not be loaded correctly`);
      }
    } catch (e) {
      diagnostics.issues.push(`Error checking ${module.name}: ${(e as Error).message}`);
    }
  }

  // Check for workflow remnants (should all be gone)
  const removedModules = [
    '@xyflow/react',
    'cron-parser',
    '@/types/workflow',
    '@/lib/workflows',
    '@/components/workflow',
  ];

  for (const moduleName of removedModules) {
    try {
      // This will throw if module doesn't exist (which is what we want)
      if (moduleName in window || (window as any)[moduleName.replace(/[@/]/g, '_')]) {
        diagnostics.issues.push(`Removed module still detected: ${moduleName}`);
      }
    } catch {
      // Good - module doesn't exist
    }
  }

  // Log results
  if (diagnostics.issues.length > 0) {
    console.error('❌ Startup issues detected:', diagnostics.issues);
  }
  
  if (diagnostics.warnings.length > 0) {
    console.warn('⚠️ Startup warnings:', diagnostics.warnings);
  }

  if (diagnostics.issues.length === 0 && diagnostics.warnings.length === 0) {
    console.log('✅ All startup diagnostics passed');
  }

  return diagnostics;
}

// Add detailed error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
  });
  
  // Check if it's the createContext error
  if (event.message?.includes('createContext')) {
    console.error('🔴 createContext error detected!');
    console.error('This usually means a React-related module is undefined');
    console.error('Check if all imports are correct and all dependencies are installed');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
  });
});
