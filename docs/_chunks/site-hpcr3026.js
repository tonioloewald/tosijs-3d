import{Ut as s}from"./site-ktyw28d4.js";import{ku as i}from"./site-86tpqddf.js";import{sE as e}from"./site-yf4sr5jd.js";class u extends s{constructor(o){super(o);this.sound=this.registerDataInput("sound",i)}_execute(o,l){let t=this.sound.getValue(o);if(!t){this._reportError(o,"No sound provided"),this.out._activateSignal(o);return}t.stop(),this.out._activateSignal(o)}getClassName(){return"FlowGraphStopSoundBlock"}}var r=!1;function a(){if(r)return;r=!0,e("FlowGraphStopSoundBlock",u)}a();
export{u as Lm,a as Mm};

//# debugId=B2EE476E5B7EE32964756E2164756E21
//# sourceMappingURL=site-hpcr3026.js.map
