import{Ut as C}from"./site-2z5azex9.js";import{ku as z,mu as A}from"./site-5mc4escc.js";import{sE as y}from"./site-tvqrtn5a.js";class D extends C{constructor(b){super(b);this.sound=this.registerDataInput("sound",z),this.volume=this.registerDataInput("volume",A,1)}_execute(b,J){let j=this.sound.getValue(b);if(!j){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}let I=this.volume.getValue(b);j.volume=I,this.out._activateSignal(b)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var q=!1;function H(){if(q)return;q=!0,y("FlowGraphSetSoundVolumeBlock",D)}H();
export{D as Pm,H as Qm};

//# debugId=7B32C7804FE9F84A64756E2164756E21
//# sourceMappingURL=site-2jf4pdnf.js.map
