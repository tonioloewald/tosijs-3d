import{tt}from"./site-rg764awy.js";import{P}from"./site-eg49xxv2.js";import{o}from"./site-wv18jmj5.js";class wp extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Mp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",wp)}Mp();
export{wp,Mp};

//# debugId=4DAFD2A092822C2F64756E2164756E21
//# sourceMappingURL=site-x5zzhbgt.js.map
