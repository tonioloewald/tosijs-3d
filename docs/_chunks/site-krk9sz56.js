import{it}from"./site-2z9zdtr9.js";import{w,V}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Yp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Xp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Yp)}Xp();
export{Yp,Xp};

//# debugId=CFAA5FB9B61C528864756E2164756E21
//# sourceMappingURL=site-krk9sz56.js.map
