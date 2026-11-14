import{it}from"./site-3t3g319r.js";import{w,V}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class jp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Qp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",jp)}Qp();
export{jp,Qp};

//# debugId=9BC55C775CC4BBF364756E2164756E21
//# sourceMappingURL=site-hgtm04sx.js.map
