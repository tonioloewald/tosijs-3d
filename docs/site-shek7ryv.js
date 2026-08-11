import{as as J}from"./site-fk6vvnk0.js";import{Ut as H}from"./site-2z5azex9.js";import{xu as A}from"./site-5mc4escc.js";import{sE as z}from"./site-tvqrtn5a.js";class K extends H{constructor(b){super(b);this.delayIndex=this.registerDataInput("delayIndex",A)}_execute(b,M){let j=J(this.delayIndex.getValue(b));if(j<0||isNaN(j)||!isFinite(j))return this._reportError(b,"Invalid delay index");let q=b._getGlobalContextVariable("pendingDelays",[])[j];if(q)q.dispose();this.out._activateSignal(b)}getClassName(){return"FlowGraphCancelDelayBlock"}}var v=!1;function L(){if(v)return;v=!0,z("FlowGraphCancelDelayBlock",K)}L();
export{K as or,L as pr};

//# debugId=D27E49FE47CB8B3C64756E2164756E21
//# sourceMappingURL=site-shek7ryv.js.map
