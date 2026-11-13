import{it}from"./site-qyhmxwr1.js";import{w}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Hp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Yp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Hp)}Yp();
export{Hp,Yp};

//# debugId=18700BD9C4EFCC9564756E2164756E21
//# sourceMappingURL=site-ptbef1cn.js.map
