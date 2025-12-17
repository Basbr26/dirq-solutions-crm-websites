/**
 * Push Notification Client
 * Handles web push notifications and service worker registration
 */

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export class PushNotificationClient {
  private static serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Initialize push notifications
   */
  static async init(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service worker registered:', this.serviceWorkerRegistration);

      // Request permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return false;
        }
      }

      // Subscribe to push
      await this.subscribe();

      // Handle messages from service worker
      this.setupMessageListener();

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return false;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      console.log('Push subscription created:', subscription);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed to push
   */
  static async isSubscribed(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking push subscription:', error);
      return false;
    }
  }

  /**
   * Send subscription to backend
   */
  private static async sendSubscriptionToBackend(
    subscription: PushSubscription
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
      return false;
    }
  }

  /**
   * Setup message listener for service worker
   */
  private static setupMessageListener(): void {
    if (!navigator.serviceWorker) {
      return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, deepLink, notifications } = event.data;

      if (type === 'NAVIGATE') {
        window.location.hash = deepLink;
      } else if (type === 'NEW_NOTIFICATIONS') {
        // Dispatch custom event for app to handle
        window.dispatchEvent(
          new CustomEvent('push-notifications', {
            detail: { notifications }
          })
        );
      }
    });
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission !== 'default') {
      return Notification.permission;
    }

    return Notification.requestPermission();
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get current subscription
   */
  static async getSubscription(): Promise<PushSubscriptionJSON | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        return null;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return subscription ? (subscription.toJSON() as any) : null;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Show test notification
   */
  static async showTestNotification(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }

    await this.serviceWorkerRegistration.showNotification('Test Notification', {
      body: 'This is a test push notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification'
    });
  }

  /**
   * Enable background sync
   */
  static async enableBackgroundSync(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      // Check if Background Sync API is available
      if (!('sync' in this.serviceWorkerRegistration)) {
        console.log('Background Sync API not available');
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.serviceWorkerRegistration as any).sync.register('sync-notifications');
      console.log('Background sync registered');
      return true;
    } catch (error) {
      console.error('Error enabling background sync:', error);
      return false;
    }
  }

  /**
   * Enable periodic background sync (if available)
   */
  static async enablePeriodicSync(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      // Check if Periodic Background Sync API is available
      if (!('periodicSync' in this.serviceWorkerRegistration)) {
        console.log('Periodic Background Sync API not available');
        return false;
      }

      // Register periodic sync to check every 12 hours
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.serviceWorkerRegistration as any).periodicSync.register('check-notifications', {
        minInterval: 12 * 60 * 60 * 1000 // 12 hours
      });

      console.log('Periodic sync registered');
      return true;
    } catch (error) {
      console.error('Error enabling periodic sync:', error);
      return false;
    }
  }

  /**
   * Unregister service worker
   */
  static async unregister(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const success = await this.serviceWorkerRegistration.unregister();
      if (success) {
        this.serviceWorkerRegistration = null;
      }
      return success;
    } catch (error) {
      console.error('Error unregistering service worker:', error);
      return false;
    }
  }

  /**
   * Get service worker status
   */
  static async getStatus(): Promise<{
    supported: boolean;
    registered: boolean;
    subscribed: boolean;
    permission: NotificationPermission;
  }> {
    return {
      supported: this.isSupported(),
      registered: !!this.serviceWorkerRegistration,
      subscribed: await this.isSubscribed(),
      permission: Notification.permission as NotificationPermission
    };
  }
}
