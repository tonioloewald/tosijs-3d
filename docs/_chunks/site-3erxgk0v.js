import{Ut as a}from"./site-ktyw28d4.js";import{ku as s}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class i extends a{constructor(e){super(e);this.sound=this.registerDataInput("sound",s)}_execute(e,l){let t=this.sound.getValue(e);if(!t){this._reportError(e,"No sound provided"),this.out._activateSignal(e);return}if(t.state===5)t.resume();else if(t.state===2||t.state===3)t.pause();this.out._activateSignal(e)}getClassName(){return"FlowGraphPauseSoundBlock"}}var r=!1;function u(){if(r)return;r=!0,o("FlowGraphPauseSoundBlock",i)}u();
export{i as Nm,u as Om};

//# debugId=1E140B6AD34FBBF164756E2164756E21
//# sourceMappingURL=site-3erxgk0v.js.map
