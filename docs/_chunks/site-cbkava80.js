import{it}from"./site-tabsjb83.js";import{O}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class Vp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function zp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Vp)}zp();
export{Vp,zp};

//# debugId=ABE173BB2FD0E0E964756E2164756E21
//# sourceMappingURL=site-cbkava80.js.map
