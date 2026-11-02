import{it}from"./site-tabsjb83.js";import{O,V,ct}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class cm extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function um(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",cm)}um();
export{cm,um};

//# debugId=8363E76CC595C95864756E2164756E21
//# sourceMappingURL=site-v2ycgq11.js.map
