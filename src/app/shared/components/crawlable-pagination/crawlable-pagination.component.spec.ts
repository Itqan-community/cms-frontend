import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { UI_LANGUAGE, UiLanguage } from '../../../core/i18n/ui-language';
import {
  CrawlablePaginationComponent,
  paginationQueryParams,
  parsePageSizeParam,
} from './crawlable-pagination.component';

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

  it('keeps a non-default page size in the page links', async () => {
    const fixture = await render('ar', 1, 144, 48);
    const el: HTMLElement = fixture.nativeElement;
    const pageLinks = Array.from(el.querySelectorAll('li.ant-pagination-item a')).map((a) =>
      a.getAttribute('href')
    );

    expect(pageLinks).toEqual(['/?page_size=48', '/?page=2&page_size=48', '/?page=3&page_size=48']);
  });

  it('parses only offered page sizes and omits defaults from query params', () => {
    expect(parsePageSizeParam('48')).toBe(48);
    expect(parsePageSizeParam('1000')).toBe(12);
    expect(parsePageSizeParam(null)).toBe(12);
    expect(paginationQueryParams(1, 12)).toEqual({ page: null, page_size: null });
    expect(paginationQueryParams(2, 24)).toEqual({ page: 2, page_size: 24 });
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

  it('leaves a Ctrl/Cmd-click to the browser without changing the current page', async () => {
    const fixture = await render('ar', 1, 36, 12);
    const emitted: number[] = [];
    fixture.componentInstance.pageIndexChange.subscribe((p) => emitted.push(p));
    const page2 = fixture.nativeElement.querySelectorAll(
      'li.ant-pagination-item a'
    )[1] as HTMLAnchorElement;
    // Runs after the component's handler: record what it did, then keep the runner on its page.
    const prevented: boolean[] = [];
    page2.addEventListener('click', (e) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    });

    page2.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    );
    page2.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true })
    );

    expect(prevented).toEqual([false, false]);
    expect(emitted).toEqual([]);
  });
});
