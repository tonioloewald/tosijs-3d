import{it}from"./site-sxxg2v6h.js";import{O,V}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class Gp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Up(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Gp)}Up();
export{Gp,Up};

//# debugId=0110163F5BCCC51664756E2164756E21
//# sourceMappingURL=site-vgwzf8b7.js.map
