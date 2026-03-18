import { Component, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { QuranDataService } from '../../services/quran-data.service';

@Component({
  selector: 'app-surahs',
  imports: [],
  templateUrl: './surahs.html',
  styleUrl: './surahs.less',
})
export class Surahs implements OnInit {
  private _quranService = inject(QuranDataService);

  surahs = toSignal(this._quranService.getSurahs(), { initialValue: [] });

  ngOnInit(): void {
    console.log(this.surahs());
  }
}
