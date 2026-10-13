import{tt}from"./site-4jsq7n1s.js";import{P,k}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class Fp extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P),this.volume=this.registerDataInput("volume",k,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function kp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Fp)}kp();
export{Fp,kp};

//# debugId=C93BF8154A4E104164756E2164756E21
//# sourceMappingURL=site-e59tjca1.js.map
