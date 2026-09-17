import { AudioPlayback, type PlayableMedia } from './audio-playback';

const DURATION_MS = 60_000;

/** A stand-in for `<audio>`: the interface is narrow enough to implement honestly. */
function fakeMedia(overrides: Partial<PlayableMedia> = {}): PlayableMedia & { plays: number } {
  return {
    paused: true,
    currentTime: 0,
    plays: 0,
    play() {
      this.plays++;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
    ...overrides,
  };
}

describe('AudioPlayback', () => {
  it('starts paused at the beginning', () => {
    const playback = new AudioPlayback();

    expect(playback.isPlaying()).toBeFalse();
    expect(playback.positionMs()).toBe(0);
  });

  it('does nothing before an element is attached', () => {
    const playback = new AudioPlayback();

    expect(() => playback.toggle()).not.toThrow();
    expect(playback.isPlaying()).toBeFalse();
  });

  it('starts playback when paused', () => {
    const media = fakeMedia();
    const playback = new AudioPlayback();
    playback.attach(media);

    playback.toggle();

    expect(media.plays).toBe(1);
  });

  it('pauses playback when playing', () => {
    const media = fakeMedia({ paused: false });
    const playback = new AudioPlayback();
    playback.attach(media);

    playback.toggle();

    expect(media.paused).toBeTrue();
  });

  it('reports not playing when the browser refuses to play', async () => {
    const media = fakeMedia({ play: () => Promise.reject(new Error('blocked')) });
    const playback = new AudioPlayback();
    playback.attach(media);
    playback.onPlay();

    playback.toggle();
    await Promise.resolve();

    expect(playback.isPlaying()).toBeFalse();
  });

  it('seeks the element in seconds while reporting milliseconds', () => {
    const media = fakeMedia();
    const playback = new AudioPlayback();
    playback.attach(media);

    playback.seekTo(21_480, DURATION_MS);

    expect(playback.positionMs()).toBe(21_480);
    expect(media.currentTime).toBe(21.48);
  });

  it('refuses to seek before the start of the track', () => {
    const playback = new AudioPlayback();
    playback.attach(fakeMedia());

    playback.seekTo(-5_000, DURATION_MS);

    expect(playback.positionMs()).toBe(0);
  });

  it('refuses to seek past the end of the track', () => {
    const playback = new AudioPlayback();
    playback.attach(fakeMedia());

    playback.seekTo(90_000, DURATION_MS);

    expect(playback.positionMs()).toBe(DURATION_MS);
  });

  it('seeks relative to where it already is', () => {
    const playback = new AudioPlayback();
    playback.attach(fakeMedia());

    playback.seekTo(10_000, DURATION_MS);
    playback.seekBy(-1_000, DURATION_MS);

    expect(playback.positionMs()).toBe(9_000);
  });

  it('follows the element as it plays', () => {
    const media = fakeMedia({ currentTime: 12.345 });
    const playback = new AudioPlayback();
    playback.attach(media);

    playback.onTimeUpdate();

    expect(playback.positionMs()).toBe(12_345);
  });

  it('tracks play and pause events from the element', () => {
    const playback = new AudioPlayback();

    playback.onPlay();
    expect(playback.isPlaying()).toBeTrue();

    playback.onPause();
    expect(playback.isPlaying()).toBeFalse();
  });
});
