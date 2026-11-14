import{it,ci}from"./site-3t3g319r.js";import{qt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Ex extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",qt)}_execute(e,a){let r=ci(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function Rx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",Ex)}Rx();
export{Ex,Rx};

//# debugId=D00468F79AD878B764756E2164756E21
//# sourceMappingURL=site-126202s4.js.map
