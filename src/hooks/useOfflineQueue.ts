import { useEffect, useState } from 'react';

interface QueuedAction {
  id: string;
  type: 'approval' | 'comment' | 'meeting';
  payload: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = 'dirq_offline_queue';
const STORE_NAME = 'actions';

/**
 * Offline Queue Hook
 * Manages offline-first action queue using IndexedDB.
 * Automatically syncs queued actions when connection is restored.
 * 
 * @returns Object with queue management functions
 * @returns queue - Array of queued actions
 * @returns isOnline - Current online/offline status
 * @returns addToQueue - Add action to offline queue
 * @returns syncQueue - Manually trigger queue sync
 * @returns clearQueue - Clear all queued actions
 * 
 * @example
 * ```tsx
 * const { addToQueue, isOnline, queue } = useOfflineQueue();
 * 
 * // Queue action when offline
 * if (!isOnline) {
 *   addToQueue('approval', { documentId: '123', approved: true });
 * }
 * 
 * // Show offline indicator
 * {!isOnline && (
 *   <div>Offline - {queue.length} actions queued</div>
 * )}
 * ```
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const dbRef = React.useRef<IDBDatabase | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const openDB = async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      });
    };

    openDB()
      .then((db) => {
        dbRef.current = db;
        loadQueue();
      })
      .catch((err) => console.error('Failed to open IndexedDB:', err));
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQueue = async () => {
    if (!dbRef.current) return;

    const transaction = dbRef.current.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      setQueue(request.result as QueuedAction[]);
    };
  };

  const addToQueue = async (
    type: QueuedAction['type'],
    payload: Record<string, unknown>
  ) => {
    if (!dbRef.current) return;

    const action: QueuedAction = {
      id: `${type}_${Date.now()}`,
      type,
      payload,
      timestamp: Date.now(),
      synced: false,
    };

    const transaction = dbRef.current.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(action);

    setQueue((prev) => [...prev, action]);
  };

  const removeFromQueue = async (id: string) => {
    if (!dbRef.current) return;

    const transaction = dbRef.current.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const syncQueue = async () => {
    const unsynced = queue.filter((item) => !item.synced);

    for (const action of unsynced) {
      try {
        // Send to server
        const response = await fetch('/api/actions/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });

        if (response.ok) {
          // Mark as synced
          if (dbRef.current) {
            const transaction = dbRef.current.transaction(
              [STORE_NAME],
              'readwrite'
            );
            const store = transaction.objectStore(STORE_NAME);
            const updatedAction = { ...action, synced: true };
            store.put(updatedAction);

            setQueue((prev) =>
              prev.map((item) => (item.id === action.id ? updatedAction : item))
            );
          }
        }
      } catch (error) {
        console.error('Sync failed for action:', action.id, error);
        // Keep in queue for retry
      }
    }
  };

  return {
    queue,
    isOnline,
    unsynced: queue.filter((item) => !item.synced).length,
    addToQueue,
    removeFromQueue,
    syncQueue,
  };
}

// Fix React import
import React from 'react';
