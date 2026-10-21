import{tt}from"./site-nkyb6jj0.js";import{P,V,ct}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class rm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function sm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",rm)}sm();
export{rm,sm};

//# debugId=6C1056DBA81EF05864756E2164756E21
//# sourceMappingURL=site-eq022nhz.js.map
