import{tt}from"./site-yk445q08.js";import{I}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class Np extends tt{constructor(e){super(e);this.sound=this.registerDataInput("sound",I)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Bp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Np)}Bp();
export{Np,Bp};

//# debugId=35314BE71DCF545F64756E2164756E21
//# sourceMappingURL=site-h7qxaz2s.js.map
