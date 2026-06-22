import { Component, computed, input, output, signal } from '@angular/core';
import { Word } from '../../models/mushaf.model';

/**
 * A single Quran word. Highlights on hover/click; emits the word on selection so
 * a parent can react (e.g. show metadata later).
 */
@Component({
  selector: 'app-word-chip',
  standalone: true,
  templateUrl: './word-chip.component.html',
  styleUrl: './word-chip.component.less',
})
export class WordChipComponent {
  word = input.required<Word>();
  /** Whether this word is the currently selected one (driven by the parent). */
  selected = input(false);

  wordClick = output<Word>();

  protected readonly hovered = signal(false);
  protected readonly active = computed(() => this.hovered() || this.selected());

  protected onClick(): void {
    this.wordClick.emit(this.word());
  }
}
