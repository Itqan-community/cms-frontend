import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

const SCRIPT_ID = 'structured-data-jsonld';

@Injectable({
  providedIn: 'root',
})
export class JsonLdService {
  private readonly document = inject(DOCUMENT);

  /** Injects a `<script type="application/ld+json">` in <head>, replacing any previous one. */
  setSchema(schema: object): void {
    this.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = SCRIPT_ID;
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }

  remove(): void {
    this.document.getElementById(SCRIPT_ID)?.remove();
  }
}
