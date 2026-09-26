import{tt}from"./site-5tw2831p.js";import{I,k,ut}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Kp extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",I),this.volume=this.registerDataInput("volume",k,1),this.startOffset=this.registerDataInput("startOffset",k,0),this.loop=this.registerDataInput("loop",ut,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let s=this.volume.getValue(t),r=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:s,startOffset:r,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var o=!1;function Jp(){if(o)return;o=!0,a("FlowGraphPlaySoundBlock",Kp)}Jp();
export{Kp,Jp};

//# debugId=7C281BEB6A6085A764756E2164756E21
//# sourceMappingURL=site-s07fxv19.js.map
