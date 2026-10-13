import{tt}from"./site-4jsq7n1s.js";import{P}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class Np extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Bp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Np)}Bp();
export{Np,Bp};

//# debugId=E1475823C249E60A64756E2164756E21
//# sourceMappingURL=site-9zj9jzdc.js.map
