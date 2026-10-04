import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import type { ContentChange } from '../../models/asset-content.models';
import { ContentChangesComponent } from './content-changes.component';

function change(
  unitId: number,
  changeType: ContentChange['change_type'],
  oldText: string,
  newText: string
): ContentChange {
  return {
    unit_type: 'ayah',
    unit_id: unitId,
    label: `1:${unitId}`,
    change_type: changeType,
    old_text: oldText,
    new_text: newText,
  };
}

describe('ContentChangesComponent', () => {
  function render(changes: ContentChange[], compact = false) {
    const fixture = TestBed.createComponent(ContentChangesComponent);
    fixture.componentRef.setInput('changes', changes);
    fixture.componentRef.setInput('compact', compact);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentChangesComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('counts each kind of change', () => {
    const fixture = render([
      change(1, 'added', '', 'new'),
      change(2, 'modified', 'a', 'b'),
      change(3, 'modified', 'c', 'd'),
      change(4, 'removed', 'gone', ''),
    ]);

    expect(fixture.componentInstance.counts()).toEqual({ added: 1, modified: 2, removed: 1 });
  });

  it('shows added text, removed text, and a before/after comparison for edits', () => {
    const fixture = render([
      change(1, 'added', '', 'fresh text'),
      change(2, 'removed', 'old text', ''),
      change(3, 'modified', 'In the name of God', 'In the name of Allah'),
    ]);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.content-changes__item--added')?.textContent).toContain('fresh text');
    expect(el.querySelector('.content-changes__item--removed')?.textContent).toContain('old text');
    const modified = el.querySelector('.content-changes__item--modified')!;
    expect(modified.querySelector('.change-compare__word--removed')?.textContent).toBe('God');
    expect(modified.querySelector('.change-compare__word--added')?.textContent).toBe('Allah');
  });

  it('folds long unchanged text around an edit and shows it all on request', () => {
    const words = (from: number, to: number) =>
      Array.from({ length: to - from }, (_, i) => `w${from + i}`).join(' ');
    const fixture = render([
      change(
        1,
        'modified',
        `${words(0, 40)} God ${words(40, 80)}`,
        `${words(0, 40)} Allah ${words(40, 80)}`
      ),
    ]);
    const el: HTMLElement = fixture.nativeElement;
    const after = () => el.querySelector('.change-compare__text--after')!;

    expect(after().querySelectorAll('.change-compare__gap').length).toBe(2);
    expect(after().textContent).not.toContain('w0 ');
    expect(after().querySelector('.change-compare__word--added')?.textContent).toBe('Allah');

    el.querySelector<HTMLButtonElement>('.content-changes__toggle')!.click();
    fixture.detectChanges();

    expect(after().querySelector('.change-compare__gap')).toBeNull();
    expect(after().textContent).toContain('w0 ');
  });

  describe('compact (versions list)', () => {
    const words = (from: number, to: number) =>
      Array.from({ length: to - from }, (_, i) => `w${from + i}`).join(' ');
    const edit = () =>
      change(
        1,
        'modified',
        `${words(0, 40)} God ${words(40, 80)}`,
        `${words(0, 40)} Allah ${words(40, 80)}`
      );

    it('stacks before above after', () => {
      const el: HTMLElement = render([edit()], true).nativeElement;

      expect(el.querySelector('.change-compare--stacked')).not.toBeNull();
    });

    it('keeps only a couple of words around each change', () => {
      const el: HTMLElement = render([edit()], true).nativeElement;
      const after = el.querySelector('.change-compare__text--after')!;

      expect(after.textContent).toContain('w38 w39 Allah w40 w41');
      expect(after.textContent).not.toContain('w37');
      expect(after.textContent).not.toContain('w42');
    });

    it('leaves the default layout and context alone', () => {
      const el: HTMLElement = render([edit()]).nativeElement;

      expect(el.querySelector('.change-compare--stacked')).toBeNull();
      expect(el.querySelector('.change-compare__text--after')!.textContent).toContain('w34');
    });
  });

  it('filters the list to one kind of change', () => {
    const fixture = render([change(1, 'added', '', 'new'), change(2, 'removed', 'gone', '')]);

    fixture.componentInstance.setFilter('removed');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.content-changes__item');
    expect(items.length).toBe(1);
    expect(items[0].classList).toContain('content-changes__item--removed');
  });

  it('renders long lists in pages and reveals more on request', () => {
    const many = Array.from({ length: 120 }, (_, i) => change(i + 1, 'added', '', `t${i}`));
    const fixture = render(many);
    const count = () => fixture.nativeElement.querySelectorAll('.content-changes__item').length;

    expect(count()).toBe(50);
    fixture.componentInstance.showMore();
    fixture.detectChanges();
    expect(count()).toBe(100);
  });

  it('says there are no changes instead of showing empty filters', () => {
    const fixture = render([]);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.content-changes__none')?.textContent).toContain(
      'ADMIN.CONTENT_CHANGES.NONE'
    );
    expect(el.querySelector('.content-changes__filters')).toBeNull();
  });

  it("shows a reviewer's comment, who left it, and the review outcome", () => {
    const reviewed: ContentChange = {
      ...change(1, 'modified', 'old', 'new'),
      review_state: 'commented',
      review_comment: 'Spelling of the first word',
      reviewed_by: 'Aisha',
      reviewed_at: '2026-09-24T10:00:00Z',
    };
    const fixture = render([reviewed, change(2, 'added', '', 'fresh')]);
    const el: HTMLElement = fixture.nativeElement;

    const reviews = el.querySelectorAll('.content-changes__review');
    expect(reviews.length).toBe(1);
    expect(reviews[0].textContent).toContain('Spelling of the first word');
    expect(reviews[0].textContent).toContain('Aisha');
    expect(reviews[0].textContent).toContain('ADMIN.REVIEW.STATE.COMMENTED');
  });
});
