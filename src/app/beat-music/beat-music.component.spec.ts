import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeatMusicComponent } from './beat-music.component';

describe('BeatMusicComponent', () => {
  let component: BeatMusicComponent;
  let fixture: ComponentFixture<BeatMusicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BeatMusicComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BeatMusicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
