import{Ut as C}from"./site-40a1yrg8.js";import{ku as z,mu as A}from"./site-v2rprchq.js";import{sE as y}from"./site-c9kedmgh.js";class D extends C{constructor(b){super(b);this.sound=this.registerDataInput("sound",z),this.volume=this.registerDataInput("volume",A,1)}_execute(b,J){let j=this.sound.getValue(b);if(!j){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}let I=this.volume.getValue(b);j.volume=I,this.out._activateSignal(b)}getClassName(){return"FlowGraphSetSoundVolumeBlock"}}var q=!1;function H(){if(q)return;q=!0,y("FlowGraphSetSoundVolumeBlock",D)}H();
export{D as Pm,H as Qm};

//# debugId=D7A00E6FA881EB0064756E2164756E21
//# sourceMappingURL=site-3kex3vsc.js.map
