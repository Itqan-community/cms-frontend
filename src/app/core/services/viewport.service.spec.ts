import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BREAKPOINTS } from '../constants/breakpoints';
import { ViewportService } from './viewport.service';

describe('ViewportService', () => {
  afterEach(() => document.querySelector('[ng-server-context]')?.remove());

  it('renders for a desktop width on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const viewport = TestBed.inject(ViewportService);

    expect(viewport.width()).toBe(BREAKPOINTS.xl);
    expect(viewport.isDesktop()).toBeTrue();
  });

  it('uses the window width in a client-rendered page', () => {
    const viewport = TestBed.inject(ViewportService);

    expect(viewport.width()).toBe(window.innerWidth);
  });

  it('keeps the server width until a server-rendered page finishes initial render', async () => {
    const marker = document.createElement('div');
    marker.setAttribute('ng-server-context', 'ssr');
    document.body.appendChild(marker);

    @Component({ standalone: true, template: '' })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    const viewport = TestBed.inject(ViewportService);

    expect(viewport.width()).toBe(BREAKPOINTS.xl);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(viewport.width()).toBe(window.innerWidth);
  });
});
