import{Qe}from"./site-z8mqhr1b.js";import{R,B,nt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class kd extends Qe{constructor(t){super(t);this.sound=this.registerDataInput("sound",R),this.volume=this.registerDataInput("volume",B,1),this.startOffset=this.registerDataInput("startOffset",B,0),this.loop=this.registerDataInput("loop",nt,!1)}_execute(t,i){let e=this.sound.getValue(t);if(!e){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}let s=this.volume.getValue(t),r=this.startOffset.getValue(t),l=this.loop.getValue(t);e.play({volume:s,startOffset:r,loop:l}),this.out._activateSignal(t)}getClassName(){return"FlowGraphPlaySoundBlock"}}var o=!1;function Vd(){if(o)return;o=!0,a("FlowGraphPlaySoundBlock",kd)}Vd();
export{kd,Vd};

//# debugId=5C2BC0F5CEC88DA164756E2164756E21
//# sourceMappingURL=site-a7cqmzme.js.map
