import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ClipboardWriter } from '../../services/clipboard-writer';

export type CodeLineKind = 'cmd' | 'out' | 'comment';

export interface CodeLine {
  text: string;
  kind: CodeLineKind;
}

export const cmd = (text: string): CodeLine => ({ text, kind: 'cmd' });
export const out = (text: string): CodeLine => ({ text, kind: 'out' });
export const comment = (text: string): CodeLine => ({ text, kind: 'comment' });

/** Terminal transcript: `$ foo` → command, `# foo` → comment, anything else → output. */
export function codeLines(...lines: string[]): CodeLine[] {
  return lines.map((text) => ({
    text,
    kind: text.startsWith('#') ? 'comment' : text.startsWith('$') ? 'cmd' : 'out',
  }));
}

/** A terminal-style code block from the landing mockups, with an optional copy button. */
@Component({
  selector: 'app-landing-code',
  standalone: true,
  imports: [TranslatePipe],
  styleUrls: ['./code-block.component.less'],
  templateUrl: './code-block.component.html',
})
export class LandingCodeBlockComponent {
  private readonly clipboard = inject(ClipboardWriter);

  readonly lines = input.required<CodeLine[]>();
  readonly heading = input<string>('');
  readonly copyable = input(false);
  /** Shown as plain lines (code) rather than a `$` prompt; the copy button copies them all. */
  readonly snippet = input(false);

  readonly copyState = signal<'idle' | 'copied' | 'failed'>('idle');

  /** What the copy button puts on the clipboard: the commands without their `$ ` prompt. */
  readonly copyText = computed(() => {
    const lines = this.lines();
    const picked = this.snippet()
      ? lines.filter((l) => l.kind !== 'comment')
      : lines.filter((l) => l.kind === 'cmd');
    return picked.map((l) => l.text.replace(/^\$ /, '')).join('\n');
  });

  async copy(): Promise<void> {
    const ok = await this.clipboard.write(this.copyText());
    this.copyState.set(ok ? 'copied' : 'failed');
    setTimeout(() => this.copyState.set('idle'), 2000);
  }
}
