import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BeatMusicComponent } from './beat-music/beat-music.component';

const routes: Routes =
[
  { path: 'beat',                                       component: BeatMusicComponent               },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
