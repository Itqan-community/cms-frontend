import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Surahs } from './surahs';

describe('Surahs', () => {
  let component: Surahs;
  let fixture: ComponentFixture<Surahs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Surahs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Surahs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
