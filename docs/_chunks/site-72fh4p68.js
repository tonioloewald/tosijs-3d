import{Vs as a}from"./site-gda1mzz6.js";import{lt as s}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class i extends a{constructor(e){super(e);this.sound=this.registerDataInput("sound",s)}_execute(e,l){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function u(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",i)}u();
export{i as Zm,u as _m};

//# debugId=D9EB62F8E00DA0FC64756E2164756E21
//# sourceMappingURL=site-72fh4p68.js.map
