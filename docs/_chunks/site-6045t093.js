import{tt}from"./site-d92hj336.js";import{P}from"./site-q1pk93qz.js";import{o}from"./site-synvytjq.js";class Dp extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",P)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Lp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Dp)}Lp();
export{Dp,Lp};

//# debugId=5DD1A96F47ED165764756E2164756E21
//# sourceMappingURL=site-6045t093.js.map
