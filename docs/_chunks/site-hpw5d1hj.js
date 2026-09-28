import{tt}from"./site-c6g1b76s.js";import{I}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class em extends tt{constructor(o){super(o);this.sound=this.registerDataInput("sound",I)}_execute(o,e){let t=this.sound.getValue(o);if(!t){this._reportError(o,"No sound provided"),this.out._activateSignal(o);return}t.stop(),this.out._activateSignal(o)}getClassName(){return"FlowGraphStopSoundBlock"}}var r=!1;function tm(){if(r)return;r=!0,a("FlowGraphStopSoundBlock",em)}tm();
export{em,tm};

//# debugId=A6034C114AC9A9D964756E2164756E21
//# sourceMappingURL=site-hpw5d1hj.js.map
