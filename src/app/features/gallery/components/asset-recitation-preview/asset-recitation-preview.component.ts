import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';
import type { RecitationPreview } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

type PreviewTrack = RecitationPreview['tracks'][number];

/**
 * "Listen" sample for a recitation: its first surahs with an audio player each.
 * Only one plays at a time. Hidden while loading and when the recitation has none.
 */
@Component({
  selector: 'app-asset-recitation-preview',
  standalone: true,
  imports: [NgIcon, TranslateModule],
  templateUrl: './asset-recitation-preview.component.html',
  styleUrl: './asset-recitation-preview.component.less',
})
export class AssetRecitationPreviewComponent {
  readonly assetId = input.required<number>();

  private readonly assetsService = inject(AssetsService);
  private readonly translate = inject(TranslateService);
  /** The interface language, as a signal so the surah names follow it. */
  private readonly uiLang = toSignal(this.translate.onLangChange.pipe(map((event) => event.lang)), {
    initialValue: this.translate.currentLang,
  });
  private playing: HTMLAudioElement | null = null;

  readonly preview = toSignal(
    toObservable(this.assetId).pipe(
      switchMap((id) =>
        this.assetsService.getRecitationPreview(id).pipe(catchError(() => of(null)))
      )
    ),
    { initialValue: null }
  );

  surahName(track: PreviewTrack): string {
    return this.uiLang() === 'ar' ? track.surah_name : track.surah_name_en;
  }

  /** Starting a track pauses the one already playing. */
  onPlay(event: Event): void {
    const audio = event.target as HTMLAudioElement;
    if (this.playing && this.playing !== audio) {
      this.playing.pause();
    }
    this.playing = audio;
  }
}
