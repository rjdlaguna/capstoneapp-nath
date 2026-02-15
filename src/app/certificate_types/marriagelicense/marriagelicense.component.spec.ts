import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarriagelicenseComponent } from './marriagelicense.component';

describe('MarriagelicenseComponent', () => {
  let component: MarriagelicenseComponent;
  let fixture: ComponentFixture<MarriagelicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarriagelicenseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarriagelicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
