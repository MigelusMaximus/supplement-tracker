import { exportBackup } from '../db';

/** Export everything and hand it to the browser as a file download. */
export async function downloadBackup() {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `supplements-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const BACKUP_EVERY = 30 * 86_400_000;

export const backupIsRecent = (lastBackupAt: number | null) => lastBackupAt != null && Date.now() - lastBackupAt < BACKUP_EVERY;

/** Time to nag: there's real data, no recent backup, and the user didn't press "Later" recently. */
export const backupDue = (s: { lastBackupAt: number | null; backupNudgeAfter: number | null }, entries: number) =>
  entries >= 20 && !backupIsRecent(s.lastBackupAt) && (s.backupNudgeAfter == null || Date.now() > s.backupNudgeAfter);

export const snoozeUntil = (days: number) => Date.now() + days * 86_400_000;

export function backupAge(lastBackupAt: number | null): string {
  if (!lastBackupAt) return 'Never backed up';
  const days = Math.floor((Date.now() - lastBackupAt) / 86_400_000);
  return days === 0 ? 'Last backup: today' : days === 1 ? 'Last backup: yesterday' : `Last backup: ${days} days ago`;
}
