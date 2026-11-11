import{it}from"./site-j6ranrbs.js";import{w,V}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Yp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Xp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Yp)}Xp();
export{Yp,Xp};

//# debugId=CFAA5FB9B61C528864756E2164756E21
//# sourceMappingURL=site-8fek9apg.js.map
