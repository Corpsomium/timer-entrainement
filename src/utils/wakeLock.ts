let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch (e) {
    wakeLock = null;
  }
}

export function releaseWakeLock(): void {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
