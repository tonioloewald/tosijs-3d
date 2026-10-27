import{it}from"./site-v7dfb6ky.js";import{P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Dp extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",P)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Lp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Dp)}Lp();
export{Dp,Lp};

//# debugId=97E8DE52B311BC2564756E2164756E21
//# sourceMappingURL=site-7w4225xx.js.map
