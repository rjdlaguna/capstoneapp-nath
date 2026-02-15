import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeathdelayedComponent } from './deathdelayed.component';

describe('DeathdelayedComponent', () => {
  let component: DeathdelayedComponent;
  let fixture: ComponentFixture<DeathdelayedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeathdelayedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeathdelayedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
