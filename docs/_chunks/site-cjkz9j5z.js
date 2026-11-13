import{it}from"./site-qyhmxwr1.js";import{w,V}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class jp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Qp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",jp)}Qp();
export{jp,Qp};

//# debugId=9BC55C775CC4BBF364756E2164756E21
//# sourceMappingURL=site-cjkz9j5z.js.map
