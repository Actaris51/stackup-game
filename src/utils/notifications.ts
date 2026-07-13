// Local notifications — daily-streak reminder (iOS).
//
// Two rules learned the hard way on this project (Apple 2.1 rejection):
// 1. NEVER request the notification permission at launch — it would race the
//    ATT prompt (iOS silently drops ATT if another system UI is pending).
//    We ask contextually, once, after the player's 3rd game: by then they've
//    demonstrated interest and the ATT flow is long finished.
// 2. Everything here is best-effort: failures log and return, never throw
//    into gameplay code.
//
// Scheduling model: the streak "ticks" when the app OPENS (tickDailyStreak in
// App.tsx), so while the app is running the streak is always safe for today.
// We therefore (re)schedule a single reminder for the NEXT evening at 19:30
// whenever the app goes to background, and clear pending reminders when it
// becomes active again. If the player opens the app the next day, the cycle
// repeats; if not, the reminder fires and nudges them before the streak dies.

import { AppState, Platform } from 'react-native';
import {
  getDailyStreak,
  hasPlayedStreakToday,
  isNotifPermissionAsked,
  markNotifPermissionAsked,
} from './storage';

let Notifications: any = null;
if (Platform.OS === 'ios') {
  // require() behind a guard: absent/broken in Expo Go is non-fatal, and web
  // never reaches this (Platform.OS === 'web').
  try {
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
}

const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 30;
/** Only nag players who have something to lose. */
const MIN_STREAK_TO_REMIND = 2;

async function hasPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings?.granted === true;
  } catch {
    return false;
  }
}

/**
 * Contextual one-time permission ask, called from the game-over flow.
 * Fires only after the 3rd game ever, and only if never asked before.
 * Never awaited by gameplay code — the system dialog can sit as long as
 * the user wants.
 */
export async function maybeAskNotificationPermissionAfterGame(
  gamesPlayed: number
): Promise<void> {
  if (!Notifications) return;
  if (gamesPlayed < 3) return;
  try {
    if (await isNotifPermissionAsked()) return;
    await markNotifPermissionAsked();
    const current = await Notifications.getPermissionsAsync();
    console.log('[Notif] permission status before ask:', current?.status);
    if (current?.granted || current?.status === 'denied') return;
    const result = await Notifications.requestPermissionsAsync();
    console.log('[Notif] permission ask resolved:', result?.status);
  } catch (e) {
    console.log('[Notif] permission ask failed (non-fatal)', e);
  }
}

/** Next occurrence of 19:30: today if still ahead and the streak is at risk
 *  today, otherwise tomorrow. */
function nextReminderDate(playedToday: boolean, now = new Date()): Date {
  const target = new Date(now);
  target.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  if (playedToday || target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Replace any pending reminder with a fresh one reflecting current streak
 * state. Called when the app goes to background.
 */
export async function rescheduleStreakReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    if (!(await hasPermission())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const streak = await getDailyStreak();
    if (streak < MIN_STREAK_TO_REMIND) return;

    const playedToday = await hasPlayedStreakToday();
    const date = nextReminderDate(playedToday);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Ta série est en jeu !',
        body: `${streak} jours d'affilée sur StackUp — ouvre le jeu pour la garder.`,
        sound: 'default',
      },
      trigger: { type: 'date', date },
    });
    console.log('[Notif] streak reminder scheduled for', date.toISOString());
  } catch (e) {
    console.log('[Notif] reschedule failed (non-fatal)', e);
  }
}

// AppState wiring — install once from App.tsx.
let schedulerInstalled = false;
export function installStreakReminderScheduler(): void {
  if (schedulerInstalled) return;
  if (!Notifications) return;
  schedulerInstalled = true;

  let prev = AppState.currentState;
  AppState.addEventListener('change', (next) => {
    if (prev === 'active' && next !== 'active') {
      // Leaving the app: schedule the nudge for the next evening.
      rescheduleStreakReminder().catch(() => {});
    } else if (prev !== 'active' && next === 'active') {
      // Back in the app: clear pending reminders (they'd be stale/noisy).
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    }
    prev = next;
  });
}
