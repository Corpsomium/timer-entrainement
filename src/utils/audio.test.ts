import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildBeepDataUri,
  beep,
  beepCountdown,
  beepEnd,
  ensureAudio,
  getAudioMuteHint,
  unlockAudio,
} from './audio';

describe('audio helpers', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator() {
          return {
            type: 'sine',
            frequency: { value: 0 },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
        }
        resume = vi.fn(async () => {
          this.state = 'running';
        });
        close = vi.fn(async () => {
          this.state = 'closed';
        });
        addEventListener = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes a mute-switch hint for ambient mode', () => {
    expect(getAudioMuteHint().toLowerCase()).toMatch(/mute|bips/);
  });

  it('builds a WAV data URI for HTMLAudio fallback', () => {
    const uri = buildBeepDataUri(880, 0.11, 'square', 0.14);
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('caches identical beep data URIs', () => {
    const a = buildBeepDataUri(440, 0.1, 'sine', 0.2);
    const b = buildBeepDataUri(440, 0.1, 'sine', 0.2);
    expect(a).toBe(b);
  });

  it('ensureAudio / unlockAudio / beep do not throw', () => {
    expect(() => ensureAudio()).not.toThrow();
    expect(() => unlockAudio()).not.toThrow();
    expect(() => beep(440, 0.05)).not.toThrow();
    expect(() => beepCountdown()).not.toThrow();
    expect(() => beepEnd()).not.toThrow();
  });
});
