import{Ut as D}from"./site-40a1yrg8.js";import{ku as z}from"./site-v2rprchq.js";import{sE as v}from"./site-c9kedmgh.js";class H extends D{constructor(b){super(b);this.sound=this.registerDataInput("sound",z)}_execute(b,J){let m=this.sound.getValue(b);if(!m){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}m.stop(),this.out._activateSignal(b)}getClassName(){return"FlowGraphStopSoundBlock"}}var q=!1;function I(){if(q)return;q=!0,v("FlowGraphStopSoundBlock",H)}I();
export{H as Lm,I as Mm};

//# debugId=C4D1D37B62BEB9AE64756E2164756E21
//# sourceMappingURL=site-y06th31g.js.map
