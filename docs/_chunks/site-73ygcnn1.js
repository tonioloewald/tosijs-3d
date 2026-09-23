import{Vs as l}from"./site-gda1mzz6.js";import{lt as u,nt as i}from"./site-rrva3mwb.js";import{hG as r}from"./site-qd0cy957.js";class s extends l{constructor(e){super(e);this.sound=this.registerDataInput("sound",u),this.volume=this.registerDataInput("volume",i,1)}_execute(e,m){let o=this.sound.getValue(e);if(!o){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let n=this.volume.getValue(e);o.volume=n,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphSetSoundVolumeBlock",s)}a();
export{s as $m,a as an};

//# debugId=E8AC0CDFD09073E864756E2164756E21
//# sourceMappingURL=site-73ygcnn1.js.map
