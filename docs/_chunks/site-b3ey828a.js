import{tt}from"./site-rg764awy.js";import{P,V}from"./site-eg49xxv2.js";import{o}from"./site-wv18jmj5.js";class Np extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Bp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Np)}Bp();
export{Np,Bp};

//# debugId=B4637AD8B93290FB64756E2164756E21
//# sourceMappingURL=site-b3ey828a.js.map
