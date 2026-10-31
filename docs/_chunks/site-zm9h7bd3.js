import{it}from"./site-3hzw4f8j.js";import{O,V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Vp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function zp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Vp)}zp();
export{Vp,zp};

//# debugId=4C98CB6279DA56A364756E2164756E21
//# sourceMappingURL=site-zm9h7bd3.js.map
