import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-beat-music',
  templateUrl: './beat-music.component.html',
  styleUrls: ['./beat-music.component.scss']
})
export class BeatMusicComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  getUrl()
  {
    return "/assets/kda_pic.jpg";
  }

}
