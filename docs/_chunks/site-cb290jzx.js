import{tt,ai}from"./site-nkyb6jj0.js";import{Qt}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class hx extends tt{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ai(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function dx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",hx)}dx();
export{hx,dx};

//# debugId=6A31C9A356F119F064756E2164756E21
//# sourceMappingURL=site-cb290jzx.js.map
