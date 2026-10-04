import{tt}from"./site-yk445q08.js";import{I,k}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class Fp extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",I),this.volume=this.registerDataInput("volume",k,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function kp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Fp)}kp();
export{Fp,kp};

//# debugId=B82FC977B2212B3364756E2164756E21
//# sourceMappingURL=site-6tw7981s.js.map
