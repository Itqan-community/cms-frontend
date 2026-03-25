import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RecitationSearchComponent } from './recitation-search.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('RecitationSearchComponent', () => {
  let component: RecitationSearchComponent;
  let fixture: ComponentFixture<RecitationSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecitationSearchComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitationSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filtersChanged after debounce on search input', fakeAsync(() => {
    spyOn(component.filtersChanged, 'emit');
    component.filters.search = 'مشاري';
    component.onSearchInput();

    // Verify it's not emitted immediately due to debounce
    expect(component.filtersChanged.emit).not.toHaveBeenCalled();

    // Fast-forward 400ms (debounce time used in the component)
    tick(400);

    expect(component.filtersChanged.emit).toHaveBeenCalledWith({
      search: 'مشاري',
      riwayah: '',
      type: '',
    });
  }));

  it('should clear old timeout if a new search input occurs within debounce time', fakeAsync(() => {
    spyOn(component.filtersChanged, 'emit');

    component.filters.search = 'm';
    component.onSearchInput();
    tick(200);

    component.filters.search = 'mi';
    component.onSearchInput();
    tick(200);

    // After total 400ms, only one emission should happen (the last one)
    expect(component.filtersChanged.emit).not.toHaveBeenCalled();

    tick(200); // Complete the second debounce
    expect(component.filtersChanged.emit).toHaveBeenCalledTimes(1);
    expect(component.filtersChanged.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'mi' })
    );
  }));

  it('should emit filtersChanged immediately on filter change', () => {
    spyOn(component.filtersChanged, 'emit');
    component.filters.riwayah = 'حفص';
    component.onFilterChange();
    expect(component.filtersChanged.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ riwayah: 'حفص' })
    );
  });
});
