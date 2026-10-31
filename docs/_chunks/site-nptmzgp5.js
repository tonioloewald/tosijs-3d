import{it}from"./site-3hzw4f8j.js";import{O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Np extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",O)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Bp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Np)}Bp();
export{Np,Bp};

//# debugId=D10470B3FCD5128E64756E2164756E21
//# sourceMappingURL=site-nptmzgp5.js.map
