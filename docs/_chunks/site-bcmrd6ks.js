import{as as J}from"./site-cg7jrefc.js";import{Ut as H}from"./site-40a1yrg8.js";import{xu as A}from"./site-v2rprchq.js";import{sE as z}from"./site-c9kedmgh.js";class K extends H{constructor(b){super(b);this.delayIndex=this.registerDataInput("delayIndex",A)}_execute(b,M){let j=J(this.delayIndex.getValue(b));if(j<0||isNaN(j)||!isFinite(j))return this._reportError(b,"Invalid delay index");let q=b._getGlobalContextVariable("pendingDelays",[])[j];if(q)q.dispose();this.out._activateSignal(b)}getClassName(){return"FlowGraphCancelDelayBlock"}}var v=!1;function L(){if(v)return;v=!0,z("FlowGraphCancelDelayBlock",K)}L();
export{K as or,L as pr};

//# debugId=E880663766FF498B64756E2164756E21
//# sourceMappingURL=site-bcmrd6ks.js.map
