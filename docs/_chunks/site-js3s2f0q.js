import{tt}from"./site-4jsq7n1s.js";import{P,k,lt}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class nm extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",k,1),this.startOffset=this.registerDataInput("startOffset",k,0),this.loop=this.registerDataInput("loop",lt,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let r=this.volume.getValue(t),a=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:r,startOffset:a,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var s=!1;function om(){if(s)return;s=!0,o("FlowGraphPlaySoundBlock",nm)}om();
export{nm,om};

//# debugId=433B043E5411914964756E2164756E21
//# sourceMappingURL=site-js3s2f0q.js.map
