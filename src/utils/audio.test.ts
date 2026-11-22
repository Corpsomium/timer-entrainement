import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildBeepDataUri,
  beep,
  beepCountdown,
  beepEnd,
  ensureAudio,
  getAudioDebugInfo,
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
    vi.stubGlobal(
      'Audio',
      class {
        src = '';
        volume = 1;
        muted = false;
        loop = false;
        currentTime = 0;
        preload = 'auto';
        play = vi.fn(async () => undefined);
        pause = vi.fn();
        setAttribute = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes a mute / Brave hint', () => {
    expect(getAudioMuteHint().toLowerCase()).toMatch(/bips|brave|mute/);
  });

  it('builds a WAV data URI', () => {
    const uri = buildBeepDataUri(880, 0.11, 'square', 0.14);
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('ensureAudio / unlockAudio / beep do not throw', () => {
    expect(() => ensureAudio()).not.toThrow();
    expect(() => unlockAudio()).not.toThrow();
    expect(() => beep(440, 0.05)).not.toThrow();
    expect(() => beepCountdown()).not.toThrow();
    expect(() => beepEnd()).not.toThrow();
  });

  it('exposes debug snapshot fields', () => {
    unlockAudio();
    const info = getAudioDebugInfo();
    expect(info).toHaveProperty('audioSessionSupported');
    expect(info).toHaveProperty('audioContextState');
    expect(info).toHaveProperty('lastBeepMethod');
    expect(info).toHaveProperty('htmlPrimed');
    expect(info).toHaveProperty('silentLoopPlaying');
    expect(info).toHaveProperty('preferredPath');
  });
});
