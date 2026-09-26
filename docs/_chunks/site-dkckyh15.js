import{Qe}from"./site-z8mqhr1b.js";import{R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class _d extends Qe{constructor(e){super(e);this.sound=this.registerDataInput("sound",R)}_execute(e,o){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function gd(){if(r)return;r=!0,a("FlowGraphPauseSoundBlock",_d)}gd();
export{_d,gd};

//# debugId=476EB0494BFA5F8E64756E2164756E21
//# sourceMappingURL=site-dkckyh15.js.map
