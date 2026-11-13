import{it,ci}from"./site-qyhmxwr1.js";import{Qt}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Ex extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ci(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function Rx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",Ex)}Rx();
export{Ex,Rx};

//# debugId=7403D326C735A27964756E2164756E21
//# sourceMappingURL=site-15ts3x6p.js.map
