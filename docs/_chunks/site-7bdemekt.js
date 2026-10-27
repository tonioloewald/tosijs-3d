import{it}from"./site-v7dfb6ky.js";import{P,V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Np extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Bp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Np)}Bp();
export{Np,Bp};

//# debugId=A739069D7BDE33F664756E2164756E21
//# sourceMappingURL=site-7bdemekt.js.map
