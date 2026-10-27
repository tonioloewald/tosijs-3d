import{it,li}from"./site-v7dfb6ky.js";import{Qt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class hx extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=li(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function dx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",hx)}dx();
export{hx,dx};

//# debugId=F292479C6D77FF2E64756E2164756E21
//# sourceMappingURL=site-j22w5x8v.js.map
