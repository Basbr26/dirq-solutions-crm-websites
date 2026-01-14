import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';

interface UseGlobalShortcutsOptions {
  onShowHelp?: () => void;
  onOpenSearch?: () => void;
  onNewItem?: () => void;
}

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const navigate = useNavigate();

  // Navigation shortcuts
  useHotkeys('g,h', () => navigate('/'), {
    preventDefault: true,
    description: 'Go to Dashboard',
  });

  useHotkeys('g,c', () => navigate('/companies'), {
    preventDefault: true,
    description: 'Go to Companies',
  });

  useHotkeys('g,n', () => navigate('/contacts'), {
    preventDefault: true,
    description: 'Go to Contacts',
  });

  useHotkeys('g,p', () => navigate('/projects'), {
    preventDefault: true,
    description: 'Go to Projects',
  });

  useHotkeys('g,q', () => navigate('/quotes'), {
    preventDefault: true,
    description: 'Go to Quotes',
  });

  useHotkeys('g,a', () => navigate('/calendar'), {
    preventDefault: true,
    description: 'Go to Calendar',
  });

  // Action shortcuts
  useHotkeys('/', (e) => {
    e.preventDefault();
    options.onOpenSearch?.();
  }, {
    preventDefault: true,
    description: 'Focus search',
  });

  useHotkeys('shift+?', () => {
    options.onShowHelp?.();
  }, {
    preventDefault: true,
    description: 'Show keyboard shortcuts',
  });

  useHotkeys('n', (e) => {
    e.preventDefault();
    options.onNewItem?.();
  }, {
    preventDefault: true,
    description: 'New item (context-dependent)',
  });

  // Escape to close dialogs/modals - this will be handled by individual components
  // but we can provide a global handler if needed
}
