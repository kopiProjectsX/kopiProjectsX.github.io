import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { BeatMap, KeyInterface } from 'src/helpers/modules/interfaces/interfaces';

const CANVAS_HEIGHT_SCALE       : number = 0.80;
const CANVAS_WIDTH_SCALE        : number = 0.80;
const CANVAS_STATIC_KEYS_OFFSET : number = 100;
const COUNT_DOWN                : number = 3;
const CIRCLE_FILL_TIME          : number = 0.12;
const BEAT_MAP_GEN              : boolean = true;
const DYNAMIC_CIRC_RAD_OFFSET   : number = 4;

const C_SCALE: number = 50; // Scale used to compute the Circle's radius from the screen width
const T_SCALE: number = 12; // Scale used to compute the tick/button spacing from the screen width
const O_SCALE: number = 1.5; // Scale used to compute the offset from the left side of the screen

const KEY_CODES: any =
{
    'a': 0,
    's': 1,
    'd': 2,
    'f': 3,
    ' ': 4,
    'j': 5,
    'k': 6,
    'l': 7,
    ';': 8,
};

const SCORES: string[] =
[
    'Miss',
    'Poor',
    'Ok',
    'Great',
    'Perfect',
];

const buttons: string[] = ['a', 's', 'd', 'f', ' ', 'j', 'k', 'l', ';'];

@Component({
  selector: 'app-beat-music',
  templateUrl: './beat-music.component.html',
  styleUrls: ['./beat-music.component.scss']
})

export class BeatMusicComponent implements OnInit
{
    // Canvas and Audio
    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('audio', { static: true }) audio!: ElementRef<HTMLAudioElement>;
    private ctx: CanvasRenderingContext2D | null = null as any;

    // Game Status
    public gameRunning: boolean = false;

    // Assets
    public bgImage : string = "/assets/kda_pic.jpg";
    public currSong: string = "/assets/kda-short.mp3";
    public currMap : string = "/assets/kda_beatmap_1.json";

    public songFile: any = null;
    public songURL : any = null;

    // Game Displays
    public dispMsg : string = '';
    public totalScore: number = 0;
    public hitScore  : string = '';

    // Dimensions
    public width: number = window.innerWidth;
    public height: number = window.innerHeight;

    public circleRadius: number = window.innerWidth / C_SCALE;
    public ticks: number = window.innerWidth / T_SCALE;
    public offset: number = this.ticks / O_SCALE;

    // Keys
    public staticKeys: KeyInterface[] =
    [
        {keyCodes: ['a'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['s'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['d'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['f'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: [' '], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['j'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['k'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: ['l'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}, 
        {keyCodes: [';'], x: 0, y: 0, tHit: 0, aHit: 0, hit: false}
    ];

    // Temporary to hold generated BeatMap
    public beatMapGen: BeatMap[] = [];

    // BeatMap Buffer
    private idx: number = 0; //Start of where we are on the beat map
    public beatMap : BeatMap[] = null as any;

    // Engine and Drawings
    private engineStarted: boolean = false;
    private prev: number = Date.now();
    private now: number = Date.now();
    private dt : number = 0;

    private posOffset: number = 0; // How far dynamic object falls

    // Window Request Frame
    private windowRequest: any = null;

    // Preload Helper
    public preloadObserve: Subscription = null as any;
    public preloadSource = new Subject<any>();
    public preload$ = this.preloadSource.asObservable();
    public preloadSend(data : any) { this.preloadSource.next(data); }

    @HostListener('window:resize', ['$event']) onResize(event: any) 
    {
        // Reset Game Dimensions
        this.setDimensions(event);

        // Reset the Key Spacing
        this.setKeySpacing(this.staticKeys, this.ticks);

        // Reset the Beat Map Spacing
        this.setBeatMapSpacing(this.beatMap, this.ticks);

        // Reset the Canvas
        this.setCanvas();
    }

    constructor(private cd: ChangeDetectorRef, private dom: DomSanitizer, private httpClient: HttpClient)
    {
        // Reset Game Dimensions
        this.setDimensions();

        // Preload Beat Map & Spacing asynchronously
        this.preLoadBeatMap(this.currMap);

        // Preload Song
        this.preLoadSong(this.currSong);

        // Initialize the Key Spacing
        this.setKeySpacing(this.staticKeys, this.ticks);

        // Handle Event Listeners
        this.addEventListeners();
    }

    ngOnInit(): void
    {
        // Initialize Audio Event Listeners
        this.audio.nativeElement.ontimeupdate = this.gamePlayingListener();
        this.audio.nativeElement.onended = this.gameEndedListener();

        // Initialize 2d context
        this.ctx = this.canvas.nativeElement.getContext('2d');

        // Reset the Canvas
        this.setCanvas();

        // Start the Engine
        this.preloadObserve = this.preload$.subscribe((data: boolean) => 
        {
            if(this.engineStarted == false && data)
            {
                this.engineStarted = true;
                this.init();
            }
        });
    }

    ngAfterContentInit()
    {
        this.setDimensions();
    }

    ngOnDestroy() : void
    {
        this.preloadObserve.unsubscribe();
    }

    // Reset the initial Dimensions of the Game Board
    private setDimensions(event?: any) : void
    {
        if(event)
        {
            this.width = event.target.innerWidth;
            this.height = event.target.innerHeight;
        }

        this.circleRadius = this.width / C_SCALE;
        this.ticks = this.width / T_SCALE;
        this.offset = this.ticks / O_SCALE;
    }

    // Initialize the global key spacing
    private setKeySpacing(keys: KeyInterface[], ticks: number) : void
    {
        keys.forEach((obj: KeyInterface, i: number) => 
        {
            obj.x = i * ticks;
        });
    }

    private setBeatMapSpacing(beatMap: BeatMap[], ticks: number) : void
    {
        beatMap.forEach((obj: BeatMap) => 
        {
            obj.x = KEY_CODES[obj.c] * ticks;
        });
    }

    private setCanvas() : void
    {        
        let h: any = document.getElementById('bg-game')?.clientHeight;

        // Set the Canvas height & width
        this.canvas.nativeElement.height = ((!!h) ? h: this.height) * CANVAS_HEIGHT_SCALE;
        this.canvas.nativeElement.width = this.width * CANVAS_WIDTH_SCALE;

        // Clear Canvas
        this.clearCanvas(this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        // Draw the Static Keys
        this.staticKeys.forEach((obj: KeyInterface) => 
        {
            this.drawCircles(
                obj.x + this.offset, 
                this.canvas.nativeElement.height - CANVAS_STATIC_KEYS_OFFSET, 
                this.circleRadius, 
                'pink', 
                false, obj.keyCodes[0]);
        });
    }

    // Asynchronous function to fetch the beat maps & 
    // song to start the game
    public async startGame()
    {
        this.gameRunning = true;
        this.dispMsg = "Loading...";
        if(!this.songURL)
        {
            this.songFile = await this.createFile(this.currSong);

            await this.computeLength(this.songFile)
            .then((data : any) =>
            {
                if(data.duration > 3600)
                {
                    return;
                }
                else
                {
                    this.songURL = this.dom.bypassSecurityTrustUrl(URL.createObjectURL(this.songFile));
                }
            });
        }
        this.cd.detectChanges();
        let count = COUNT_DOWN;

        let x = setInterval(() => 
        {
            this.dispMsg = count + '';

            if(count == 0)
            {
                this.resetGameDisplays();
                clearInterval(x);
                this.audio.nativeElement.play();
            }
            count--;
        }, 1000);
    }

    // Stops the game and takes in a message to display
    public stopGame(msg: string) : void
    {
        if(this.dispMsg != '') return;

        this.dispMsg = msg;
        this.gameRunning = false;
        
        // Stop the audio
        this.resetAudio();

        // Reset the Beat Map
        this.resetBeatMap();

        // Reset Canvas Back to initial State
        this.setCanvas();
    }

    private resetAudio() : void
    {
        this.audio.nativeElement.pause();
        this.audio.nativeElement.currentTime = 0;
    }

    public gamePlayingListener(): () => void
    {
      return (() => 
      {
  
      });
    }
  
    public gameEndedListener(): () => void
    { 
      return (() => 
      {
        if(BEAT_MAP_GEN)
        {
            console.log(this.beatMapGen);
        }
        this.stopGame('Final Score: ' + this.totalScore);
      });
    }

    // Helpers
    private resetGameDisplays() : void
    {
        this.dispMsg = '';
        this.hitScore = '';
        this.totalScore = 0;
    }

    private async createFile(songLoc: string) : Promise<File>
    {
      let resp = await fetch(songLoc);
      let data = await resp.blob();
      let metadata = { type: 'audio/mp3' };

      return new File([data], "song.mp3", metadata);
    }

    private async computeLength(file: any) : Promise<void>
    {
        return new Promise((resolve: any) => 
        {
            let objectURL = URL.createObjectURL(file);
            let sound = new Audio(objectURL);

            sound.addEventListener('canplaythrough', () => 
            {
                URL.revokeObjectURL(objectURL);
                resolve({duration: sound.duration});
            });
        });
    }

    private preLoadBeatMap(str: string) : void
    {
        this.httpClient.get(str).subscribe((data: any) =>
        {
            this.beatMap = data;
            this.setBeatMapSpacing(this.beatMap, this.ticks);
            this.preloadSend(true);
        });
    }

    private preLoadSong(str: string) : void
    {
        this.httpClient.get(str, {responseType: 'blob' as 'json'}).subscribe((data: any) =>
        {
            this.songFile = new File([data], "song.mp3", {type: 'audio/mp3'});

            this.computeLength(this.songFile)
            .then((data : any) =>
            {
                if(data.duration > 3600)
                {
                    return;
                }
                else
                {
                    this.songURL = this.dom.bypassSecurityTrustUrl(URL.createObjectURL(this.songFile));
                }
            });
        });
    }

    private addEventListeners() : void
    {
        
        document.addEventListener('keydown', (e) => 
        {
          if((e.key).charCodeAt(0) < 32 || (e.key).charCodeAt(0) > 122) e.preventDefault();
          
          this.handleInput(e.key);
          e.preventDefault();
        });
  
        window.addEventListener("keyup", (e) => 
        {
          this.handleOutput(e.key);
          e.preventDefault();
        }, false);
    }

    private handleInput = (keys : string) : void => 
    {
        let y = KEY_CODES[keys.toLocaleLowerCase()]
        if(y == null || y < 0 || this.staticKeys[y].hit) return;
        this.staticKeys[y].tHit = (Date.now() / 1000.0);
        this.staticKeys[y].aHit = this.audio.nativeElement.currentTime;
        this.staticKeys[y].hit = true;
    }
  
    private handleOutput = (keys : string) : void => 
    {
        if(BEAT_MAP_GEN && keys.toLocaleLowerCase() == '1')
        {
            console.log(this.beatMapGen);
        }

        let y = KEY_CODES[keys.toLocaleLowerCase()];

        if(y == null || y < 0)
        {
          return;
        }
  
        this.staticKeys[y].hit = false;
        
        setTimeout(() => {
          this.hitScore = '';
        }, 700);
    }

    // Draw Stuff
    public clearCanvas(width: number, height: number)
    {
        this.ctx?.clearRect(0, 0, width, height);
        this.ctx?.strokeRect(0, 0, width, height);
    }

    // x - coordinate, y - coordinate, rad - radius, c - fill/stroke style (color), f - fill or stroke, l - text
    public drawCircles(x: number, y: number, rad: number, c: string, f?: boolean, l?: string) : void
    {
        this.ctx!.fillStyle = c;
        this.ctx!.strokeStyle = c;
        this.ctx!.lineWidth = 5;
        this.ctx?.beginPath();
        this.ctx?.arc(x, y, rad, 0, 2* Math.PI, false);
        this.ctx?.closePath();
        
        if(!!l)
        {
          this.ctx!.font = Math.floor(rad / 1.5) + 'pt Calibri';
          this.ctx!.fillStyle = '#FF4048';
          this.ctx!.textAlign = 'center';
    
          if(l == ' ') l = "'  '";
    
          this.ctx?.fillText(l, x, y + 3);
        }
    
        if(f)
        {
          this.ctx?.fill();
        }
        else
        {
          this.ctx?.stroke();
        }
    }

    // Engine
    private init = () =>
    {
        this.prev = Date.now();
        this.main();
    }

    private main = () => 
    {
        this.now = Date.now();
        this.dt = (this.now - this.prev) / 1000.0;
        // Play Game
        this.realGamePlay(this.dt, this.now);

        this.prev = this.now;
        this.windowRequest = window.requestAnimationFrame(this.main);
    }

    public realGamePlay(dt: number, now: number)
    {
        // Calculate the position offset
        this.posOffset = (this.canvas.nativeElement.height - 100) / CANVAS_STATIC_KEYS_OFFSET;

        // Clear Canvas
        this.clearCanvas(this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        // Handle Key Interface events
        this.iterateKeyInterface();

        // Play Game
        if(!BEAT_MAP_GEN) this.playGame();
    }

    private playGame() : void
    {
        if(!this.audio.nativeElement.paused 
            && this.idx < this.beatMap.length 
            && this.audio.nativeElement.currentTime >= this.beatMap[this.idx].t1)
        {
            for(let i = this.idx; i < this.beatMap.length 
                && this.beatMap[i].t1 <= this.audio.nativeElement.currentTime; i++)
            {
              let val = this.beatMap[i];
              if(val.y > this.canvas.nativeElement.height)
              {
                this.idx = i + 1;
                continue;
              }
    
              if(val.s != 0) continue;
              
              this.drawCircles(
                  val.x + this.offset, 
                  val.y, this.circleRadius - DYNAMIC_CIRC_RAD_OFFSET, 
                  'pink');
              
              if(this.staticKeys[KEY_CODES[val.c]].hit == true)
              {
                let baseline = (this.canvas.nativeElement.height - 100);

                if((val.y) >= (baseline - this.posOffset*20) 
                    && (val.y) <= (baseline + this.posOffset*20))
                {
                  val.s = this.checkCollisions(val.y, baseline, this.posOffset);
                  this.printEmotes(val.s);
                }
              }
              val.y += this.posOffset;
            }
        }
    }

    public resetBeatMap() : void
    {
        this.idx = 0;

        // Static Key
        this.staticKeys.forEach((obj: KeyInterface) => 
        {
            obj.y = obj.tHit = obj.aHit = 0;
            obj.hit = false;
        });

        // Beat Map
        this.beatMap.forEach((obj: BeatMap) =>
        {
            obj.s = obj.y = 0;
        });
    }

    private printEmotes(val: number) : void
    {
      this.hitScore = SCORES[val - 1];
      this.totalScore += val;
    }
  
    private checkCollisions(y_val: number, baseline: number, offset: number) : number
    {
      if(y_val >= baseline - offset * 1 
        && y_val <= baseline + offset * 1)
      {
          return 5;
      }
      else if(y_val >= baseline - offset * 5 
        && y_val <= baseline + offset * 5)
      {
        return 4;
      }
      if(y_val >= baseline - offset * 10 
        && y_val <= baseline + offset * 10)
      {
        return 3;
      }
      else if(y_val >= baseline - offset * 15 
        && y_val <= baseline + offset * 15)
      {
        return 2;
      }
      else
      {
        return 1;
      }
    }

    private iterateKeyInterface() : void
    {
        this.staticKeys.forEach((obj: KeyInterface) =>
        {
            //Beat Map Generator
            if(BEAT_MAP_GEN)
            {
                this.generateBeatMap(obj);
            }
            
            if(obj.hit == true || this.now / 1000.0 - obj.tHit < CIRCLE_FILL_TIME)
            {
                // Fill in Circle
                this.drawCircles(
                    obj.x + this.offset, 
                    this.canvas.nativeElement.height - CANVAS_STATIC_KEYS_OFFSET, 
                    this.circleRadius, 
                    'pink', 
                    true);
            }

            // Static Drawing
            this.drawCircles(
                obj.x + this.offset, 
                this.canvas.nativeElement.height - CANVAS_STATIC_KEYS_OFFSET, 
                this.circleRadius, 
                'pink', 
                false, 
                obj.keyCodes[0]
            )
        });
    }

    private generateBeatMap(obj: KeyInterface) : void
    {
        if(obj.hit == true)
        {
          let temp = {c: obj.keyCodes[0], s: 0, x: obj.x, y: 0, t1: this.audio.nativeElement.currentTime - 1.6, 
            t2: this.audio.nativeElement.currentTime};
          this.beatMapGen.push(temp);
          obj.hit = false;
        }
    }

}