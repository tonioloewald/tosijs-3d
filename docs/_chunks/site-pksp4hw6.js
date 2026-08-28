import{Ts as s}from"./site-nv8skz8z.js";import{jt as i}from"./site-bab0thfc.js";import{fG as e}from"./site-pcap36fe.js";class u extends s{constructor(o){super(o);this.sound=this.registerDataInput("sound",i)}_execute(o,l){let t=this.sound.getValue(o);if(!t){this._reportError(o,"No sound provided"),this.out._activateSignal(o);return}t.stop(),this.out._activateSignal(o)}getClassName(){return"FlowGraphStopSoundBlock"}}var r=!1;function a(){if(r)return;r=!0,e("FlowGraphStopSoundBlock",u)}a();
export{u as Vm,a as Wm};

//# debugId=D4092035DC22298664756E2164756E21
//# sourceMappingURL=site-pksp4hw6.js.map
