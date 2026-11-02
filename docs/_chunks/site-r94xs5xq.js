import{it}from"./site-scdwvr9t.js";import{O,V}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Gp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O),this.volume=this.registerDataInput("volume",V,1)}_execute(e,i){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let u=this.volume.getValue(e);t.volume=u,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var r=!1;function Up(){if(r)return;r=!0,o("FlowGraphSetSoundVolumeBlock",Gp)}Up();
export{Gp,Up};

//# debugId=0110163F5BCCC51664756E2164756E21
//# sourceMappingURL=site-r94xs5xq.js.map
