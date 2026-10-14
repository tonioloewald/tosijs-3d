import{tt}from"./site-kqwawvd6.js";import{P,V,lt}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class nm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",lt,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function om(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",nm)}om();
export{nm,om};

//# debugId=2A4DC06CFF61509D64756E2164756E21
//# sourceMappingURL=site-vv1dv2jy.js.map
