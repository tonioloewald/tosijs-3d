import{tt}from"./site-5tw2831p.js";import{I}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Op extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",I)}_execute(e,o){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Mp(){if(r)return;r=!0,a("FlowGraphPauseSoundBlock",Op)}Mp();
export{Op,Mp};

//# debugId=8148B011F3B224D964756E2164756E21
//# sourceMappingURL=site-w9gcn3ga.js.map
