import{Vs as s}from"./site-gda1mzz6.js";import{lt as i}from"./site-rrva3mwb.js";import{hG as e}from"./site-qd0cy957.js";class u extends s{constructor(o){super(o);this.sound=this.registerDataInput("sound",i)}_execute(o,l){let t=this.sound.getValue(o);if(!t){this._reportError(o,"No sound provided"),this.out._activateSignal(o);return}t.stop(),this.out._activateSignal(o)}getClassName(){return"FlowGraphStopSoundBlock"}}var r=!1;function a(){if(r)return;r=!0,e("FlowGraphStopSoundBlock",u)}a();
export{u as Xm,a as Ym};

//# debugId=1CB385582A667C6564756E2164756E21
//# sourceMappingURL=site-vvqmxh4w.js.map
