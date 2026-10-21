import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../services/usage-api.service';
import { AssetUsageCountsComponent } from './asset-usage-counts.component';

describe('AssetUsageCountsComponent', () => {
  let fixture: ComponentFixture<AssetUsageCountsComponent>;
  let api: jasmine.SpyObj<UsageApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', ['publicCounts']);
    await TestBed.configureTestingModule({
      imports: [AssetUsageCountsComponent, TranslateModule.forRoot()],
      providers: [{ provide: UsageApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
  });

  function render(): HTMLElement {
    fixture = TestBed.createComponent(AssetUsageCountsComponent);
    fixture.componentRef.setInput('assetId', 9);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows plays, downloads and apps when the counts are available', () => {
    api.publicCounts.and.returnValue(
      of({
        plays: 1200,
        downloads: 47,
        apps: 2,
        disclaimers: [{ code: 'lower_bound', text: 'Lower bounds.' }],
        data_updated_at: null,
      })
    );

    const element = render();

    expect(api.publicCounts).toHaveBeenCalledWith(9);
    expect(element.textContent).toContain('1.2K');
    expect(element.textContent).toContain('USAGE.PUBLIC.PLAYS');
    expect(element.textContent).toContain('47');
    expect(element.querySelector('.asset-usage-counts')?.getAttribute('title')).toBe(
      'Lower bounds.'
    );
  });

  it('renders nothing while the counts are turned off', () => {
    api.publicCounts.and.returnValue(of(null));

    expect(render().querySelector('.asset-usage-counts')).toBeNull();
  });
});
