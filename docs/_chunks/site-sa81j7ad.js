import{tt,ai}from"./site-n1qmzpg8.js";import{Qt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class hx extends tt{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ai(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function dx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",hx)}dx();
export{hx,dx};

//# debugId=6A31C9A356F119F064756E2164756E21
//# sourceMappingURL=site-sa81j7ad.js.map
