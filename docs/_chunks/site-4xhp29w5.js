import{tt,oi}from"./site-5tw2831p.js";import{$t}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class rg extends tt{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",$t)}_execute(e,i){let r=oi(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function sg(){if(l)return;l=!0,a("FlowGraphCancelDelayBlock",rg)}sg();
export{rg,sg};

//# debugId=E5179D807652404E64756E2164756E21
//# sourceMappingURL=site-4xhp29w5.js.map
