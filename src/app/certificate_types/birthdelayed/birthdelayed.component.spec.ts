import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BirthdelayedComponent } from './birthdelayed.component';

describe('BirthdelayedComponent', () => {
  let component: BirthdelayedComponent;
  let fixture: ComponentFixture<BirthdelayedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BirthdelayedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BirthdelayedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
