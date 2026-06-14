import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { App } from './app';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';

@Component({ standalone: true, template: '' })
class TestPageComponent {}

describe('App', () => {
  let googleAnalyticsService: jasmine.SpyObj<GoogleAnalyticsService>;

  beforeEach(async () => {
    googleAnalyticsService = jasmine.createSpyObj<GoogleAnalyticsService>(
      'GoogleAnalyticsService',
      ['init', 'pageView', 'event']
    );

    await TestBed.configureTestingModule({
      imports: [App, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'gallery', component: TestPageComponent }]),
        { provide: GoogleAnalyticsService, useValue: googleAnalyticsService },
      ],
    }).compileComponents();

    localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('initializes Google Analytics on bootstrap', () => {
    TestBed.createComponent(App);
    expect(googleAnalyticsService.init).toHaveBeenCalled();
  });

  it('tracks page views on NavigationEnd', async () => {
    TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const titleService = TestBed.inject(Title);
    const expectedTitle = titleService.getTitle();

    await router.navigateByUrl('/gallery');

    expect(googleAnalyticsService.pageView).toHaveBeenCalledWith('/gallery', expectedTitle);
  });
});
