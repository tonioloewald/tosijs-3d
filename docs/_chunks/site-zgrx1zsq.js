import{tt}from"./site-4jsq7n1s.js";import{P}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class Dp extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",P)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Lp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Dp)}Lp();
export{Dp,Lp};

//# debugId=5F3D1D7CD56EAC6A64756E2164756E21
//# sourceMappingURL=site-zgrx1zsq.js.map
