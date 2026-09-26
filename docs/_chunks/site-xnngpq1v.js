import{Qe}from"./site-z8mqhr1b.js";import{R,B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class xd extends Qe{constructor(e){super(e);this.sound=this.registerDataInput("sound",R),this.volume=this.registerDataInput("volume",B,1)}_execute(e,u){let o=this.sound.getValue(e);if(!o){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let r=this.volume.getValue(e);o.volume=r,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var t=!1;function vd(){if(t)return;t=!0,a("FlowGraphSetSoundVolumeBlock",xd)}vd();
export{xd,vd};

//# debugId=8E786DB0DF22C0F764756E2164756E21
//# sourceMappingURL=site-xnngpq1v.js.map
