import{tt}from"./site-e0k6q2az.js";import{P,V}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class Np extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Bp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Np)}Bp();
export{Np,Bp};

//# debugId=B4637AD8B93290FB64756E2164756E21
//# sourceMappingURL=site-vb6brsm5.js.map
