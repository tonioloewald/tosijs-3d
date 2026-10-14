import{tt}from"./site-kqwawvd6.js";import{P,V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class Fp extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function kp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Fp)}kp();
export{Fp,kp};

//# debugId=79452A65942F520564756E2164756E21
//# sourceMappingURL=site-3y00mmdh.js.map
