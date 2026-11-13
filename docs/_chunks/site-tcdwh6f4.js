import{it}from"./site-qyhmxwr1.js";import{w}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Xp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function $p(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Xp)}$p();
export{Xp,$p};

//# debugId=CBB7977E94D12C6364756E2164756E21
//# sourceMappingURL=site-tcdwh6f4.js.map
