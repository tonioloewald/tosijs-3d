import{tt}from"./site-e0k6q2az.js";import{P}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class wp extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Mp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",wp)}Mp();
export{wp,Mp};

//# debugId=4DAFD2A092822C2F64756E2164756E21
//# sourceMappingURL=site-a5vt6g9h.js.map
