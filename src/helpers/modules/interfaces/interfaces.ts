export class BeatMap
{
    c!  : string; // Character
    s!  : number; // Score - used to indicate if beatmap was used
    x!  : number; // x coordinate
    y!  : number; // y coordinate
    t1! : number; // time starts to fall
    t2! : number; // time perfect hit
}

export class KeyInterface
{
    keyCodes!   : string[]; // Key Codes supported
    x!          : number;   // x coordinate
    y!          : number;   // y coordinate
    tHit!       : number;   // time hit from javascript API
    aHit!       : number;   // time hit at audio current time
    hit!        : boolean;  // if key is pressed or not
}