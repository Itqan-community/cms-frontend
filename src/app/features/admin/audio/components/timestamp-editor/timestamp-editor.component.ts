import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import type { RecitationSurahTrackListItem } from '../../../recitations/models/recitation-tracks.models';
import { RecitationsService } from '../../../recitations/services/recitations.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import type { EditorMarker, TrackTimestamps } from '../../models/audio-timestamps.models';
import {
  clampView,
  viewAround,
  zoomView,
  type WaveformView,
} from '../../utils/waveform-geometry.util';
import {
  LARGE_TRACK_MS,
  loadWaveformPeaks,
  type WaveformPeaks,
} from '../../utils/waveform-peaks.util';
import {
  WaveformCanvasComponent,
  type MarkerDragEvent,
} from '../waveform-canvas/waveform-canvas.component';
import { AudioTimestampsService } from '../../services/audio-timestamps.service';
import { AudioPlayback } from '../../utils/audio-playback';
import { formatDrift, formatNudgeStep, formatTimestamp } from '../../utils/timestamp-format.util';
import {
  NUDGE_STEPS_MS,
  applyMarkers,
  buildMarkers,
  groupByAyah,
  hasUnsavedChanges,
  markerAfter,
  markerBefore,
  markerDrift,
  moveMarker,
  nearestMarker,
  nudgeMarker,
  validateMarkers,
} from '../../utils/timestamp-markers.util';

/** One request covers every surah in a recitation, so the track lookup never pages. */
const TRACK_LOOKUP_PAGE_SIZE = 114;

/** Arrow-key seek steps. Always earlier/later in time — never flipped for RTL. */
const SEEK_STEP_MS = 1_000;
const SEEK_STEP_LARGE_MS = 5_000;

/** Keys a focused control activates itself with — the global bindings must not take them. */
const ACTIVATION_KEYS = new Set([' ', 'Enter']);

/**
 * Ayah timestamp editor.
 *
 * Edits the millisecond boundaries that say where each ayah begins and ends inside a
 * recitation track. The audio file itself is read-only here — it is played, never written.
 *
 * Reached from the tracks table on the recitation detail page, which supplies the recitation
 * slug the track lookup needs.
 */
@Component({
  selector: 'app-timestamp-editor',
  standalone: true,
  imports: [
    RouterLink,
    NgIcon,
    TranslateModule,
    NzAlertModule,
    NzButtonModule,
    NzModalModule,
    NzSkeletonModule,
    NzToolTipModule,
    WaveformCanvasComponent,
  ],
  templateUrl: './timestamp-editor.component.html',
  styleUrl: './timestamp-editor.component.less',
})
export class TimestampEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitations = inject(RecitationsService);
  private readonly timestamps = inject(AudioTimestampsService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);

  private readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audio');

  readonly nudgeSteps = NUDGE_STEPS_MS;

  /** Owns the media element and everything about where playback sits. */
  private readonly playback = new AudioPlayback();

  readonly track = signal<RecitationSurahTrackListItem | null>(null);
  readonly markers = signal<EditorMarker[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly playheadMs = this.playback.positionMs;
  readonly isPlaying = this.playback.isPlaying;

  readonly peaks = signal<WaveformPeaks | null>(null);
  readonly peaksLoading = signal(false);
  /** Non-fatal: markers stay editable on a flat timeline when the trace cannot be drawn. */
  readonly peaksError = signal<string | null>(null);
  readonly view = signal<WaveformView>({ startMs: 0, endMs: 1_000 });

  readonly loading = signal(true);
  readonly saving = signal(false);
  /** Fatal — the page cannot show anything useful. */
  readonly loadError = signal<string | null>(null);
  /** Non-fatal — audio plays, but boundaries could not be read. */
  readonly timestampsError = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private peaksAbort: AbortController | null = null;
  private recitationSlug = '';
  private folder: string | null = null;
  private loadedTimestamps: TrackTimestamps | null = null;

  readonly canEdit = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPLOAD_TIMING)
  );

  /**
   * `duration_ms` on the catalogue row is nullable, and a zero duration is not a harmless
   * default: every clamp collapses to 0, so one nudge would rewrite a marker to the start of
   * the track and a save would persist it. The decoded peaks and the media element both know
   * the real length, so they stand in when the row does not.
   */
  readonly durationMs = computed(
    () =>
      this.track()?.duration_ms ?? this.peaks()?.durationMs ?? this.playback.mediaDurationMs() ?? 0
  );

  /** Permission alone is not enough to move a marker — the track length must be known too. */
  readonly canMoveMarkers = computed(() => this.canEdit() && this.durationMs() > 0);

  readonly selectedMarker = computed(() => {
    const id = this.selectedId();
    return id ? (this.markers().find((m) => m.id === id) ?? null) : null;
  });

  readonly selectedDriftMs = computed(() => {
    const marker = this.selectedMarker();
    return marker ? markerDrift(marker) : 0;
  });

  readonly dirty = computed(() => hasUnsavedChanges(this.markers()));

  // An unknown duration has no upper bound to test against. Passing 0 would flag every marker
  // as out of range and bury the length and overlap faults that are still worth reporting.
  readonly issues = computed(() =>
    validateMarkers(
      this.markers(),
      this.durationMs() > 0 ? this.durationMs() : Number.POSITIVE_INFINITY
    )
  );

  /** Ayah rows for the list beside the transport, in recitation order. */
  readonly ayahRows = computed(() => groupByAyah(this.markers()));

  readonly backLink = computed(() =>
    this.recitationSlug ? ['/admin/recitations', this.recitationSlug] : ['/admin/recitations']
  );

  constructor() {
    // The element lives behind the loading branch, so it arrives after the first render.
    effect(() => this.playback.attach(this.audioRef()?.nativeElement ?? null));
  }

  ngOnInit(): void {
    const trackId = Number(this.route.snapshot.paramMap.get('trackId'));
    this.recitationSlug = this.route.snapshot.queryParamMap.get('recitation') ?? '';
    this.folder = this.route.snapshot.queryParamMap.get('folder');

    if (!Number.isFinite(trackId) || trackId <= 0 || !this.recitationSlug) {
      this.loadError.set(this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.ERRORS.MISSING_CONTEXT'));
      this.loading.set(false);
      return;
    }

    void this.load(trackId);
  }

  private async load(trackId: number): Promise<void> {
    this.loading.set(true);

    try {
      this.track.set(await this.fetchTrack(trackId));
    } catch (error) {
      this.loadError.set(this.errorMessage(error, 'ERRORS.TRACK_LOAD_FAILED'));
      return;
    } finally {
      this.loading.set(false);
    }

    this.view.set(clampView({ startMs: 0, endMs: this.durationMs() }, this.durationMs()));
    this.destroyRef.onDestroy(() => this.peaksAbort?.abort());

    await this.loadTimestamps(trackId);
    void this.loadPeaks();
  }

  /**
   * Decodes the audio into drawable peaks. Failure is non-fatal by design — a missing
   * cross-origin header or an over-long track costs the trace, not the editing session.
   */
  private async loadPeaks(): Promise<void> {
    const url = this.track()?.audio_url;
    if (!url) return;

    if (this.durationMs() > LARGE_TRACK_MS) {
      this.peaksError.set(this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.ERRORS.TRACK_TOO_LONG'));
      return;
    }

    this.peaksAbort = new AbortController();
    this.peaksLoading.set(true);

    try {
      this.peaks.set(await loadWaveformPeaks(url, { signal: this.peaksAbort.signal }));
      this.peaksError.set(null);
      this.adoptDiscoveredDuration();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      this.peaks.set(null);
      this.peaksError.set(this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.ERRORS.WAVEFORM_FAILED'));
    } finally {
      this.peaksLoading.set(false);
    }
  }

  /**
   * The initial view was clamped against whatever duration was known when the track loaded.
   * With none on the row that was a 200 ms window over the entire track, so it is opened up
   * once a real duration arrives from the decode or from the element's metadata.
   */
  private adoptDiscoveredDuration(): void {
    if (this.track()?.duration_ms != null) return;

    this.resetZoom();
  }

  /** One request covers a whole recitation, so finding the track never needs to page. */
  private async fetchTrack(trackId: number): Promise<RecitationSurahTrackListItem> {
    const page = await firstValueFrom(
      this.recitations.recitationTracksList({
        recitation_slug: this.recitationSlug,
        asset_id: 0,
        page: 1,
        page_size: TRACK_LOOKUP_PAGE_SIZE,
        folder: this.folder ?? undefined,
      })
    );

    const found = page.results.find((row) => row.id === trackId);
    if (!found) throw new TrackNotFoundError();

    return found;
  }

  /**
   * Boundary data is loaded separately and failure is not fatal: an admin can still play the
   * track and see its metadata, which is exactly what they need while the API contract settles.
   */
  private async loadTimestamps(trackId: number): Promise<void> {
    try {
      const loaded = await firstValueFrom(this.timestamps.load(trackId));

      this.loadedTimestamps = loaded;
      this.markers.set(buildMarkers(loaded));
      this.timestampsError.set(null);
    } catch (error) {
      this.loadedTimestamps = null;
      this.markers.set([]);
      this.timestampsError.set(this.errorMessage(error, 'ERRORS.TIMESTAMPS_LOAD_FAILED'));
    }
  }

  // --- transport ---

  togglePlay(): void {
    this.playback.toggle();
  }

  onPlay(): void {
    this.playback.onPlay();
  }

  onPause(): void {
    this.playback.onPause();
  }

  onTimeUpdate(): void {
    this.playback.onTimeUpdate();
  }

  onLoadedMetadata(): void {
    this.playback.onLoadedMetadata();
    this.adoptDiscoveredDuration();
  }

  seekTo(ms: number): void {
    this.playback.seekTo(ms, this.durationMs());
  }

  seekBy(deltaMs: number): void {
    this.playback.seekBy(deltaMs, this.durationMs());
  }

  // --- markers ---

  selectMarker(markerId: string): void {
    this.selectedId.set(markerId);
  }

  /** Selects a marker and moves the playhead to it, so the boundary can be heard immediately. */
  playFromMarker(marker: EditorMarker): void {
    this.selectMarker(marker.id);
    this.seekTo(marker.ms);
    this.view.update((view) => viewAround(view, this.durationMs(), marker.ms));
  }

  nudge(deltaMs: number): void {
    const id = this.selectedId();
    if (!id || !this.canMoveMarkers()) return;

    this.markers.update((markers) => nudgeMarker(markers, id, deltaMs, this.durationMs()));
  }

  /** Moves the selected marker to wherever playback currently sits. */
  snapToPlayhead(): void {
    const id = this.selectedId();
    if (!id || !this.canMoveMarkers()) return;

    this.markers.update((markers) => moveMarker(markers, id, this.playheadMs(), this.durationMs()));
  }

  /** The canvas proposes a position; the marker rules decide what is actually legal. */
  onMarkerDragged({ markerId, ms }: MarkerDragEvent): void {
    if (!this.canMoveMarkers()) return;

    this.markers.update((markers) => moveMarker(markers, markerId, ms, this.durationMs()));
  }

  onViewChanged(view: WaveformView): void {
    this.view.set(clampView(view, this.durationMs()));
  }

  zoomBy(factor: number): void {
    this.view.update((view) => zoomView(view, this.durationMs(), factor, this.playheadMs()));
  }

  resetZoom(): void {
    this.view.set(clampView({ startMs: 0, endMs: this.durationMs() }, this.durationMs()));
  }

  goToPreviousMarker(): void {
    const marker = markerBefore(this.markers(), this.playheadMs());
    if (marker) this.playFromMarker(marker);
  }

  goToNextMarker(): void {
    const marker = markerAfter(this.markers(), this.playheadMs());
    if (marker) this.playFromMarker(marker);
  }

  selectNearestMarker(): void {
    const marker = nearestMarker(this.markers(), this.playheadMs());
    if (marker) this.selectMarker(marker.id);
  }

  // --- saving ---

  async save(): Promise<void> {
    const base = this.loadedTimestamps;
    if (!base || !this.canEdit() || this.saving() || !this.dirty()) return;

    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.timestamps.save(applyMarkers(this.markers(), base)));

      this.loadedTimestamps = saved;
      this.markers.set(buildMarkers(saved));
      this.selectedId.set(null);
      this.message.success(this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.MESSAGES.SAVE_OK'));
    } catch (error) {
      this.message.error(this.errorMessage(error, 'MESSAGES.SAVE_ERROR'));
    } finally {
      this.saving.set(false);
    }
  }

  discardChanges(): void {
    const base = this.loadedTimestamps;
    if (!base) return;

    this.markers.set(buildMarkers(base));
    this.selectedId.set(null);
  }

  canDeactivate(): Promise<boolean> | boolean {
    if (!this.dirty()) return true;

    return new Promise<boolean>((resolve) => {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.LEAVE.TITLE'),
        nzContent: this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.LEAVE.CONTENT'),
        nzOkText: this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.LEAVE.OK'),
        nzOkDanger: true,
        nzCancelText: this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.LEAVE.CANCEL'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
        nzOnOk: () => resolve(true),
        nzOnCancel: () => resolve(false),
      });
    });
  }

  goBack(): void {
    void this.router.navigate(this.backLink());
  }

  // --- keyboard ---

  /**
   * Arrow keys map to earlier/later in time, never to visual direction: the admin panel runs
   * RTL in Arabic, and flipping them with the layout would invert their meaning mid-session.
   */
  private readonly keyBindings: Record<string, (event: KeyboardEvent) => void> = {
    ' ': () => this.togglePlay(),
    ArrowLeft: (e) => this.seekBy(e.shiftKey ? -SEEK_STEP_LARGE_MS : -SEEK_STEP_MS),
    ArrowRight: (e) => this.seekBy(e.shiftKey ? SEEK_STEP_LARGE_MS : SEEK_STEP_MS),
    '[': () => this.goToPreviousMarker(),
    ']': () => this.goToNextMarker(),
    ',': () => this.nudge(-10),
    '.': () => this.nudge(10),
    '<': () => this.nudge(-100),
    '>': () => this.nudge(100),
    Enter: () => this.snapToPlayhead(),
    Escape: () => this.selectedId.set(null),
  };

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.loadError() || isTypingTarget(event.target)) return;

    if (isSaveShortcut(event)) {
      event.preventDefault();
      void this.save();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    // Space and Enter belong to whatever holds focus. Claiming them globally would stop every
    // button on the page — nudge, zoom, save, each ayah bound — from responding to a keyboard,
    // since `preventDefault` here cancels the activation the browser would have performed.
    if (ACTIVATION_KEYS.has(event.key) && isActivationTarget(event.target)) return;

    const handler = this.keyBindings[event.key];
    if (!handler) return;

    // Escape keeps its default so it can still dismiss an open modal or dropdown.
    if (event.key !== 'Escape') event.preventDefault();
    handler(event);
  }

  // --- formatting ---

  // Template-facing aliases for the formatting utilities.
  readonly formatMs = formatTimestamp;
  readonly formatDrift = formatDrift;
  readonly formatNudge = formatNudgeStep;

  /** Track-not-found is ours; everything else goes through the shared API error resolver. */
  private errorMessage(error: unknown, fallbackKey: string): string {
    if (error instanceof TrackNotFoundError) {
      return this.translate.instant('ADMIN.AUDIO.TIMESTAMPS.ERRORS.TRACK_NOT_FOUND');
    }

    return resolveApiErrorMessage(
      error,
      { fallbackKey: `ADMIN.AUDIO.TIMESTAMPS.${fallbackKey}` },
      this.translate
    );
  }
}

/** The recitation loaded, but it has no track with this id. */
class TrackNotFoundError extends Error {}

function isSaveShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
}

/** Controls the browser activates on Space or Enter without any help from us. */
function isActivationTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return !!target.closest('button, summary, a[href], [role="button"], [role="link"]');
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}
