import{it}from"./site-x0v5x8t1.js";import{w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class jp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",w)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Qp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",jp)}Qp();
export{jp,Qp};

//# debugId=B2721CF85EF484DB64756E2164756E21
//# sourceMappingURL=site-8s686r58.js.map
