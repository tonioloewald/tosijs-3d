import{Qe}from"./site-z8mqhr1b.js";import{R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Gd extends Qe{constructor(o){super(o);this.sound=this.registerDataInput("sound",R)}_execute(o,e){let t=this.sound.getValue(o);if(!t){this._reportError(o,"No sound provided"),this.out._activateSignal(o);return}t.stop(),this.out._activateSignal(o)}getClassName(){return"FlowGraphStopSoundBlock"}}var r=!1;function zd(){if(r)return;r=!0,a("FlowGraphStopSoundBlock",Gd)}zd();
export{Gd,zd};

//# debugId=7295A1B8E1CD5F0964756E2164756E21
//# sourceMappingURL=site-v049f7vq.js.map
