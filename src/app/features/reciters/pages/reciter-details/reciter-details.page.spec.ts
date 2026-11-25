import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ssrStatusKey } from '../../../../core/ssr/ssr-http-status.util';
import { ReciterDetail } from '../../models/reciter.model';
import { ReciterService } from '../../services/reciter.service';
import { ReciterDetailsPage } from './reciter-details.page';

describe('ReciterDetailsPage after a server render', () => {
  const reciter = { id: 5, slug: 'afasy', name_ar: 'العفاسي', name_en: 'Afasy' } as ReciterDetail;

  function create(serverAssetsFailed: boolean) {
    const getReciterAssets = jasmine
      .createSpy('getReciterAssets')
      .and.returnValue(of({ count: 0, results: [] }));
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: { slug: 'afasy' }, queryParamMap: convertToParamMap({}) },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        {
          provide: ReciterService,
          useValue: { getReciter: () => of(reciter), getReciterAssets },
        },
      ],
    });
    TestBed.overrideComponent(ReciterDetailsPage, { set: { template: '', imports: [] } });
    if (serverAssetsFailed) {
      TestBed.inject(TransferState).set(ssrStatusKey('reciter-assets', 'afasy:p1'), 'error');
    }
    const page = TestBed.createComponent(ReciterDetailsPage).componentInstance;
    page.ngOnInit();
    return { page, getReciterAssets };
  }

  it('keeps the server-rendered empty assets state instead of refetching', () => {
    const { page, getReciterAssets } = create(true);

    expect(getReciterAssets).not.toHaveBeenCalled();
    expect(page.assetsLoading()).toBeFalse();
    expect(page.assets()).toEqual([]);
    expect(page.reciter()).toEqual(reciter);
  });

  it('fetches the assets when the server recorded no failure', () => {
    const { getReciterAssets } = create(false);

    expect(getReciterAssets).toHaveBeenCalledOnceWith(5, 1, 12);
  });
});
