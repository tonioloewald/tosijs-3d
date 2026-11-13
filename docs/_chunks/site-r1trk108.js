import{it}from"./site-qyhmxwr1.js";import{w,V,ct}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Up extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function Wp(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",Up)}Wp();
export{Up,Wp};

//# debugId=692D8439677838D864756E2164756E21
//# sourceMappingURL=site-r1trk108.js.map
