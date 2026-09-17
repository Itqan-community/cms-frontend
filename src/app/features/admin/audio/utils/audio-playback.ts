import { signal } from '@angular/core';

/**
 * Playback state for the timestamp editor.
 *
 * Depends on the narrow {@link PlayableMedia} shape rather than on `HTMLAudioElement`, so the
 * rules about seeking and position can be tested with a plain object — and so nothing here
 * assumes a browser. An `<audio>` element satisfies the shape structurally.
 */

/** The only parts of a media element this needs. */
export interface PlayableMedia {
  paused: boolean;
  /** Seconds, as the media API reports it. */
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
}

const MS_PER_SECOND = 1_000;

export class AudioPlayback {
  private media: PlayableMedia | null = null;

  readonly isPlaying = signal(false);
  /** Where playback currently sits, in milliseconds. */
  readonly positionMs = signal(0);

  /** Called once the template's element exists. */
  attach(media: PlayableMedia | null): void {
    this.media = media;
  }

  toggle(): void {
    if (!this.media) return;

    if (this.media.paused) {
      // A rejected play() is normal — autoplay policy, or a source that never loaded.
      void this.media.play().catch(() => this.isPlaying.set(false));
    } else {
      this.media.pause();
    }
  }

  /** Moves playback to an absolute position, clamped to the track. */
  seekTo(ms: number, durationMs: number): void {
    const clamped = Math.min(Math.max(ms, 0), Math.max(durationMs, 0));

    this.positionMs.set(clamped);
    if (this.media) this.media.currentTime = clamped / MS_PER_SECOND;
  }

  seekBy(deltaMs: number, durationMs: number): void {
    this.seekTo(this.positionMs() + deltaMs, durationMs);
  }

  // --- media element callbacks ---

  onPlay(): void {
    this.isPlaying.set(true);
  }

  onPause(): void {
    this.isPlaying.set(false);
  }

  onTimeUpdate(): void {
    if (this.media) this.positionMs.set(Math.round(this.media.currentTime * MS_PER_SECOND));
  }
}
