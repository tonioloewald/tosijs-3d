import{it}from"./site-3hzw4f8j.js";import{O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Fp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function kp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Fp)}kp();
export{Fp,kp};

//# debugId=6E600779E068BB3B64756E2164756E21
//# sourceMappingURL=site-7bffd66g.js.map
