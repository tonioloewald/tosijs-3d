import{it}from"./site-j6ranrbs.js";import{w}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Gp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Up(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Gp)}Up();
export{Gp,Up};

//# debugId=939842C635539B4664756E2164756E21
//# sourceMappingURL=site-04vte19x.js.map
