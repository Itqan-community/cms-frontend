import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of, throwError } from 'rxjs';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { RecitationsService } from '../../../recitations/services/recitations.service';
import type { RecitationSurahTrackListItem } from '../../../recitations/models/recitation-tracks.models';
import type { TrackTimestamps } from '../../models/audio-timestamps.models';
import { AudioTimestampsService } from '../../services/audio-timestamps.service';
import { TimestampEditorComponent } from './timestamp-editor.component';

const TRACK: RecitationSurahTrackListItem = {
  id: 12,
  asset_id: 0,
  surah_number: 1,
  filename: '001.mp3',
  duration_ms: 60_000,
  size_bytes: 1_024,
  audio_url: 'https://example.com/001.mp3',
};

const TIMESTAMPS: TrackTimestamps = {
  track_id: 12,
  surah_number: 1,
  surah: { start_ms: 0, end_ms: 29_000 },
  ayahs: [
    { ayah: 1, start_ms: 0, end_ms: 9_000 },
    { ayah: 2, start_ms: 10_000, end_ms: 19_000 },
  ],
};

describe('TimestampEditorComponent', () => {
  let fixture: ComponentFixture<TimestampEditorComponent>;
  let component: TimestampEditorComponent;
  let recitations: jasmine.SpyObj<RecitationsService>;
  let timestamps: jasmine.SpyObj<AudioTimestampsService>;
  let modal: jasmine.SpyObj<NzModalService>;

  /** Query params decide whether the page has enough context to load anything. */
  async function setup(
    queryParams: Record<string, string>,
    options: { failTimestamps?: boolean; trackMissing?: boolean; noDuration?: boolean } = {}
  ): Promise<void> {
    recitations = jasmine.createSpyObj<RecitationsService>('RecitationsService', [
      'recitationTracksList',
    ]);
    timestamps = jasmine.createSpyObj<AudioTimestampsService>('AudioTimestampsService', [
      'load',
      'save',
    ]);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);

    const track = options.noDuration ? { ...TRACK, duration_ms: null } : TRACK;
    recitations.recitationTracksList.and.returnValue(
      of(options.trackMissing ? { results: [], count: 0 } : { results: [track], count: 1 })
    );
    timestamps.load.and.returnValue(
      options.failTimestamps ? throwError(() => new Error('unavailable')) : of(TIMESTAMPS)
    );

    await TestBed.configureTestingModule({
      imports: [TimestampEditorComponent, TranslateModule.forRoot()],
      providers: [
        { provide: RecitationsService, useValue: recitations },
        { provide: AudioTimestampsService, useValue: timestamps },
        { provide: AdminAuthService, useValue: { hasPermission: () => true } },
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj<NzMessageService>('NzMessageService', [
            'success',
            'error',
          ]),
        },
        { provide: NzModalService, useValue: modal },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ trackId: '12' }),
              queryParamMap: convertToParamMap(queryParams),
            },
          },
        },
      ],
    })
      // NzModalService is not injected from the root here: the component imports NzModalModule,
      // whose providers land in the component's own standalone injector and shadow anything
      // `providers` above declares. Overriding the provider itself is what actually binds the
      // spy — without it the real service runs and opens modal DOM during the spec.
      .overrideProvider(NzModalService, { useValue: modal })
      // The behaviour under test is in the class; an empty template keeps the spec free of
      // the ng-zorro and icon setup the real markup needs. `set` replaces only the template,
      // so the component's own imports — and the DI they bring — stay in place.
      .overrideComponent(TimestampEditorComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(TimestampEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Loading runs through firstValueFrom, so the signals settle a microtask later.
    await fixture.whenStable();
  }

  describe('construction', () => {
    it('resolves every injected dependency', async () => {
      // Regression guard: every field initialiser on the class runs at construction, so a new
      // `inject()` with no provider here fails the whole spec rather than one assertion.
      await expectAsync(setup({ recitation: 'sample-recitation' })).toBeResolved();

      expect(component).toBeTruthy();
    });
  });

  describe('route context', () => {
    it('refuses to load when the recitation slug is missing from the link', async () => {
      await setup({});

      expect(component.loadError()).toBeTruthy();
      expect(recitations.recitationTracksList).not.toHaveBeenCalled();
    });

    it('loads the track and its boundaries when the link is complete', async () => {
      await setup({ recitation: 'sample-recitation' });

      expect(component.loadError()).toBeNull();
      expect(component.track()?.id).toBe(12);
      expect(component.markers().length).toBe(6);
    });

    it('passes the folder through to the track lookup', async () => {
      await setup({ recitation: 'sample-recitation', folder: 'high-quality' });

      expect(recitations.recitationTracksList).toHaveBeenCalledWith(
        jasmine.objectContaining({ folder: 'high-quality' })
      );
    });

    it('reports a track that is not in the recitation', async () => {
      await setup({ recitation: 'sample-recitation' }, { trackMissing: true });

      expect(component.loadError()).toBeTruthy();
      expect(component.track()).toBeNull();
    });
  });

  describe('boundary loading failures', () => {
    it('keeps the audio playable when the timestamps cannot be read', async () => {
      await setup({ recitation: 'sample-recitation' }, { failTimestamps: true });

      // Non-fatal by design: metadata and playback still work while the contract settles.
      expect(component.track()?.id).toBe(12);
      expect(component.loadError()).toBeNull();
      expect(component.timestampsError()).toBeTruthy();
      expect(component.markers().length).toBe(0);
    });
  });

  describe('editing', () => {
    it('starts clean and becomes dirty once a marker moves', async () => {
      await setup({ recitation: 'sample-recitation' });

      expect(component.dirty()).toBeFalse();

      component.selectMarker('ayah-2-start');
      component.nudge(-100);

      expect(component.dirty()).toBeTrue();
      expect(component.selectedDriftMs()).toBe(-100);
    });

    it('ignores nudges while nothing is selected', async () => {
      await setup({ recitation: 'sample-recitation' });

      component.nudge(-100);

      expect(component.dirty()).toBeFalse();
    });

    it('restores the loaded values when changes are discarded', async () => {
      await setup({ recitation: 'sample-recitation' });

      component.selectMarker('ayah-2-start');
      component.nudge(-100);
      component.discardChanges();

      expect(component.dirty()).toBeFalse();
      expect(component.selectedId()).toBeNull();
    });

    it('leaves without confirming while there is nothing to lose', async () => {
      await setup({ recitation: 'sample-recitation' });

      expect(component.canDeactivate()).toBeTrue();
      expect(modal.confirm).not.toHaveBeenCalled();
    });

    it('asks before leaving with a marker still moved', async () => {
      await setup({ recitation: 'sample-recitation' });

      component.selectMarker('ayah-2-start');
      component.nudge(-100);
      // The promise settles from the modal's own callbacks, which the spy never invokes.
      void component.canDeactivate();

      expect(modal.confirm).toHaveBeenCalled();
    });
  });

  describe('an unknown track length', () => {
    it('refuses to move a marker until a duration is known', async () => {
      await setup({ recitation: 'sample-recitation' }, { noDuration: true });

      component.selectMarker('ayah-2-start');
      component.nudge(-100);

      // A zero duration clamps every marker to 0, and a save would then persist those zeros.
      expect(component.canMoveMarkers()).toBeFalse();
      expect(component.dirty()).toBeFalse();
      expect(component.markers().find((m) => m.id === 'ayah-2-start')?.ms).toBe(10_000);
    });

    it('reports no range issues while there is no range to check against', async () => {
      await setup({ recitation: 'sample-recitation' }, { noDuration: true });

      expect(component.issues()).toEqual([]);
    });

    it('takes the duration the decode discovered and unlocks editing', async () => {
      await setup({ recitation: 'sample-recitation' }, { noDuration: true });

      component.peaks.set({ durationMs: 60_000, resolution: 100, data: new Float32Array(0) });

      expect(component.durationMs()).toBe(60_000);
      expect(component.canMoveMarkers()).toBeTrue();
    });
  });

  describe('keyboard shortcuts', () => {
    function press(key: string, target: EventTarget): KeyboardEvent {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(event);

      return event;
    }

    it('claims Space for playback when nothing else has focus', async () => {
      await setup({ recitation: 'sample-recitation' });

      expect(press(' ', document.body).defaultPrevented).toBeTrue();
    });

    it('leaves Space and Enter to the control that has focus', async () => {
      await setup({ recitation: 'sample-recitation' });
      const button = document.createElement('button');
      document.body.appendChild(button);

      try {
        // Cancelling these would stop every button on the page — nudge, zoom, save, each ayah
        // bound — from being usable from the keyboard.
        expect(press(' ', button).defaultPrevented).toBeFalse();
        expect(press('Enter', button).defaultPrevented).toBeFalse();
      } finally {
        button.remove();
      }
    });

    it('keeps the seek and nudge keys working while a button has focus', async () => {
      await setup({ recitation: 'sample-recitation' });
      const button = document.createElement('button');
      document.body.appendChild(button);

      try {
        // Only the activation keys are conceded; a button does nothing with these.
        expect(press('ArrowRight', button).defaultPrevented).toBeTrue();
        expect(press('.', button).defaultPrevented).toBeTrue();
      } finally {
        button.remove();
      }
    });
  });

  describe('saving', () => {
    it('sends the edited boundaries and clears the dirty flag', async () => {
      await setup({ recitation: 'sample-recitation' });
      timestamps.save.and.returnValue(of(TIMESTAMPS));

      component.selectMarker('ayah-2-start');
      component.nudge(-100);
      await component.save();

      expect(timestamps.save).toHaveBeenCalled();
      expect(component.dirty()).toBeFalse();
    });

    it('does not call the API when nothing has changed', async () => {
      await setup({ recitation: 'sample-recitation' });

      await component.save();

      expect(timestamps.save).not.toHaveBeenCalled();
    });
  });
});
