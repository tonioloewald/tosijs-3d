import{it}from"./site-v7dfb6ky.js";import{P,V,ct}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class rm extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1),this.startOffset=this.registerDataInput("startOffset",V,0),this.loop=this.registerDataInput("loop",ct,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function sm(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",rm)}sm();
export{rm,sm};

//# debugId=580BFFCBE9AFB6B364756E2164756E21
//# sourceMappingURL=site-90kf8z58.js.map
