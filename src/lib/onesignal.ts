// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/**
 * OneSignal Push Notification initialization.
 *
 * Supports both:
 * - Native iOS/Android via onesignal-cordova-plugin (Capacitor)
 * - Web Push via OneSignal Web SDK
 *
 * Call `initOneSignal()` once at app boot.
 * Call `promptPushPermission()` from the NotificationHabitStep.
 */

import { Capacitor } from '@/lib/stubs/capacitor';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string | undefined;

export function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID not set — push notifications disabled');
    return;
  }

  if (Capacitor.isNativePlatform()) {
    // Native Capacitor — use cordova plugin
    const OneSignalPlugin = (window as any).plugins?.OneSignal;
    if (OneSignalPlugin) {
      OneSignalPlugin.initialize(ONESIGNAL_APP_ID);
      // Don't auto-prompt — we do it from the onboarding step
      console.info('[OneSignal] Native plugin initialized');
    } else {
      console.warn('[OneSignal] Native plugin not found — will retry after deviceready');
      document.addEventListener('deviceready', () => {
        const plugin = (window as any).plugins?.OneSignal;
        if (plugin) {
          plugin.initialize(ONESIGNAL_APP_ID);
          console.info('[OneSignal] Native plugin initialized (deviceready)');
        }
      });
    }
  } else {
    // Web — use OneSignal Web SDK loaded from index.html
    const OneSignal = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred = OneSignal;

    OneSignal.push(async function (os: any) {
      await os.init({
        appId: ONESIGNAL_APP_ID,
        promptOptions: { autoPrompt: false },
        allowLocalhostAsSecureOrigin: (process.env.NODE_ENV !== 'production'),
      });
    });
  }
}

/**
 * Prompt the user to allow push notifications.
 * Called from NotificationHabitStep when the user taps Continue.
 */
export async function promptPushPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native — use cordova plugin
      const OneSignalPlugin = (window as any).plugins?.OneSignal;
      if (OneSignalPlugin?.Notifications) {
        const granted = await OneSignalPlugin.Notifications.requestPermission(true);
        return granted;
      }
      return false;
    }

    // Web — use OneSignal Web SDK
    const OneSignal = (window as any).OneSignal;
    if (OneSignal) {
      if (OneSignal.Notifications) {
        if (!OneSignal.Notifications.permission) {
          await OneSignal.Notifications.requestPermission();
        }
        return OneSignal.Notifications.permission === true;
      }
      if (OneSignal.Slidedown) {
        await OneSignal.Slidedown.promptPush();
        return true;
      }
    }

    // Fallback to native Web Notification API
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }

    return 'Notification' in window && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Set the OneSignal external user ID so we can target this user
 * with personalized notifications from the backend.
 */
export function setOneSignalExternalUserId(userId: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      const OneSignalPlugin = (window as any).plugins?.OneSignal;
      if (OneSignalPlugin) {
        OneSignalPlugin.login(userId);
      }
    } else {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal?.login) {
        OneSignal.login(userId);
      }
    }
  } catch {
    // Silently fail
  }
}

/**
 * Set data tags on the current OneSignal user. Tags are used by OneSignal
 * Segments + Journeys to automate time-based notifications (e.g. "send 2
 * days before `trial_ends_at`") entirely from the OneSignal dashboard —
 * no custom cron jobs or email automation code required.
 *
 * Tag values must be strings. For dates, pass Unix seconds:
 *   `setOneSignalTags({ trial_ends_at: String(Math.floor(date.getTime() / 1000)) })`
 */
export function setOneSignalTags(tags: Record<string, string>) {
  try {
    if (Capacitor.isNativePlatform()) {
      const OneSignalPlugin = (window as any).plugins?.OneSignal;
      if (OneSignalPlugin?.User) {
        OneSignalPlugin.User.addTags(tags);
      }
    } else {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal?.User?.addTags) {
        OneSignal.User.addTags(tags);
      }
    }
  } catch {
    // Silently fail — tag will be missing but app still works
  }
}