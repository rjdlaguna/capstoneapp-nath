import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarriagedelayedComponent } from './marriagedelayed.component';

describe('MarriagedelayedComponent', () => {
  let component: MarriagedelayedComponent;
  let fixture: ComponentFixture<MarriagedelayedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarriagedelayedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarriagedelayedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
