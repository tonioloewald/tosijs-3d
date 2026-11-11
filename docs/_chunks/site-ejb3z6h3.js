import{it,ci}from"./site-j6ranrbs.js";import{Qt}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Sx extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ci(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function yx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",Sx)}yx();
export{Sx,yx};

//# debugId=146A919CE3CAF1D464756E2164756E21
//# sourceMappingURL=site-ejb3z6h3.js.map
