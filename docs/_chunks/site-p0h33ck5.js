import{Ts as l}from"./site-nv8skz8z.js";import{jt as u,lt as i}from"./site-bab0thfc.js";import{fG as r}from"./site-pcap36fe.js";class s extends l{constructor(e){super(e);this.sound=this.registerDataInput("sound",u),this.volume=this.registerDataInput("volume",i,1)}_execute(e,m){let o=this.sound.getValue(e);if(!o){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let n=this.volume.getValue(e);o.volume=n,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphSetSoundVolumeBlock",s)}a();
export{s as Zm,a as _m};

//# debugId=AB6502F3BA6A78A564756E2164756E21
//# sourceMappingURL=site-p0h33ck5.js.map
