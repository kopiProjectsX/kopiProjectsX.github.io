import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BeatMusicComponent } from './beat-music/beat-music.component';
import { FrontpageComponent } from './frontpage/frontpage.component';

const routes: Routes =
[
  { path: '', component: BeatMusicComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
