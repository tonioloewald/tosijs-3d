import{Ut as l}from"./site-ktyw28d4.js";import{ku as u,mu as i}from"./site-86tpqddf.js";import{sE as r}from"./site-yf4sr5jd.js";class s extends l{constructor(e){super(e);this.sound=this.registerDataInput("sound",u),this.volume=this.registerDataInput("volume",i,1)}_execute(e,m){let o=this.sound.getValue(e);if(!o){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}let n=this.volume.getValue(e);o.volume=n,this.out._activateSignal(e)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphSetSoundVolumeBlock",s)}a();
export{s as Pm,a as Qm};

//# debugId=60E1BBB4EA23DDA064756E2164756E21
//# sourceMappingURL=site-qn5ffvmt.js.map
