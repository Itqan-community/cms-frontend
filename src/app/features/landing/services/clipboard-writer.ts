import { Injectable } from '@angular/core';

/** navigator.clipboard behind a seam so specs don't touch the real clipboard. */
@Injectable({ providedIn: 'root' })
export class ClipboardWriter {
  async write(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err: unknown) {
      console.warn('Could not copy to the clipboard', err);
      return false;
    }
  }
}
