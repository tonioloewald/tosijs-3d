import{it}from"./site-ktydmw50.js";import{O,V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Hp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Yp(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Hp)}Yp();
export{Hp,Yp};

//# debugId=DF5C3A1D863F8BE064756E2164756E21
//# sourceMappingURL=site-fvhxxq6q.js.map
