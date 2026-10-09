import{tt}from"./site-bj6vxf7c.js";import{I,k,lt}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class nm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",I),this.volume=this.registerDataInput("volume",k,1),this.startOffset=this.registerDataInput("startOffset",k,0),this.loop=this.registerDataInput("loop",lt,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function om(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",nm)}om();
export{nm,om};

//# debugId=5D6C771435DEF98964756E2164756E21
//# sourceMappingURL=site-6p1dgjak.js.map
