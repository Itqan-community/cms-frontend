import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { UI_LANGUAGE, UiLanguage } from '../../../core/i18n/ui-language';
import { CrawlablePaginationComponent } from './crawlable-pagination.component';

@Component({ template: '' })
class DummyRouteComponent {}

describe('CrawlablePaginationComponent', () => {
  async function render(lang: UiLanguage, pageIndex = 1, total = 36, pageSize = 12) {
    await TestBed.configureTestingModule({
      imports: [CrawlablePaginationComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyRouteComponent }]),
        provideNoopAnimations(),
        provideNzI18n(en_US),
        { provide: UI_LANGUAGE, useValue: lang },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CrawlablePaginationComponent);
    fixture.componentRef.setInput('pageIndex', pageIndex);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.detectChanges();
    return fixture;
  }

  it('renders crawlable hrefs omitting ?page=1 for Arabic', async () => {
    const fixture = await render('ar', 1, 36, 12);
    const el: HTMLElement = fixture.nativeElement;
    const pageLinks = Array.from(el.querySelectorAll('li.ant-pagination-item a')).map((a) =>
      a.getAttribute('href')
    );

    expect(pageLinks).toEqual(['/', '/?page=2', '/?page=3']);
    expect(el.querySelector('.ant-pagination-next a')?.getAttribute('href')).toBe('/?page=2');
  });

  it('preserves ?lang=en alongside ?page=N and emits pageIndexChange on click', async () => {
    const fixture = await render('en', 2, 36, 12);
    const emitted: number[] = [];
    fixture.componentInstance.pageIndexChange.subscribe((p) => emitted.push(p));

    const el: HTMLElement = fixture.nativeElement;
    const prevHref = el.querySelector('.ant-pagination-prev a')?.getAttribute('href');
    const page3 = el.querySelectorAll('li.ant-pagination-item a')[2] as HTMLAnchorElement;

    expect(prevHref).toBe('/?lang=en');
    expect(page3.getAttribute('href')).toBe('/?lang=en&page=3');

    page3.click();
    expect(emitted).toEqual([3]);
  });
});
