import{tt}from"./site-bj6vxf7c.js";import{I}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class Dp extends tt{constructor(t){super(t);this.sound=this.registerDataInput("sound",I)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function Lp(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Dp)}Lp();
export{Dp,Lp};

//# debugId=30402B5DE09725D264756E2164756E21
//# sourceMappingURL=site-6mna3e0q.js.map
