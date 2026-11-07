import{it,ci}from"./site-ktydmw50.js";import{Qt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class vx extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ci(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function Sx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",vx)}Sx();
export{vx,Sx};

//# debugId=5FA8A6D3B4BC775C64756E2164756E21
//# sourceMappingURL=site-1cjaysrx.js.map
