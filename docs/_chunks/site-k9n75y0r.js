import{tt}from"./site-yk445q08.js";import{I,k,ut}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class nm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",I),this.volume=this.registerDataInput("volume",k,1),this.startOffset=this.registerDataInput("startOffset",k,0),this.loop=this.registerDataInput("loop",ut,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function om(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",nm)}om();
export{nm,om};

//# debugId=859ECCFADBE0441764756E2164756E21
//# sourceMappingURL=site-k9n75y0r.js.map
