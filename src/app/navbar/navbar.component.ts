import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

declare let gtag: Function;

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})

export class NavbarComponent implements OnInit
{
    private _routerSub = Subscription.EMPTY;

    constructor(public router: Router)
    {
        this._routerSub = router.events.subscribe((val) => 
        {
            if(val instanceof NavigationEnd) 
            {
                this.configureGTAG(val);
            }
        });
    }

    ngOnInit(): void
    {

    }

    configureGTAG(event : NavigationEnd)
    {
        gtag('config', 'G-Q24LN24PST', 
        {
            'page_path': event.urlAfterRedirects
        });
    }

}
