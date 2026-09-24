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
  function render(changes: ContentChange[]) {
    const fixture = TestBed.createComponent(ContentChangesComponent);
    fixture.componentRef.setInput('changes', changes);
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
    expect(modified.querySelector('.content-changes__word--removed')?.textContent).toBe('God');
    expect(modified.querySelector('.content-changes__word--added')?.textContent).toBe('Allah');
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
