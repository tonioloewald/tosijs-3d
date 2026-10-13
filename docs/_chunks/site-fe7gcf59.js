import{tt,ai}from"./site-4jsq7n1s.js";import{Qt}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class dx extends tt{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ai(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function px(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",dx)}px();
export{dx,px};

//# debugId=16E15D118C9D7E0764756E2164756E21
//# sourceMappingURL=site-fe7gcf59.js.map
