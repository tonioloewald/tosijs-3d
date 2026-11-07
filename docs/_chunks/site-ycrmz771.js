import{it}from"./site-ktydmw50.js";import{O}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Up extends it{constructor(e){super(e);this.sound=this.registerDataInput("sound",O)}_execute(e,s){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function Wp(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",Up)}Wp();
export{Up,Wp};

//# debugId=6471B41D9C7C2A7C64756E2164756E21
//# sourceMappingURL=site-ycrmz771.js.map
