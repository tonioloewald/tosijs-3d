import{it}from"./site-x0v5x8t1.js";import{w,V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class qp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Zp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",qp)}Zp();
export{qp,Zp};

//# debugId=E56C5F9EE6E4EFAF64756E2164756E21
//# sourceMappingURL=site-3k3dfmsh.js.map
