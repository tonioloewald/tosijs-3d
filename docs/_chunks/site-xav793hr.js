import{as as s}from"./site-gg0bpfht.js";import{Ut as o}from"./site-ktyw28d4.js";import{xu as i}from"./site-86tpqddf.js";import{sE as a}from"./site-yf4sr5jd.js";class n extends o{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",i)}_execute(e,c){let r=s(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function p(){if(l)return;l=!0,a("FlowGraphCancelDelayBlock",n)}p();
export{n as or,p as pr};

//# debugId=41E1FF8478F9FD7364756E2164756E21
//# sourceMappingURL=site-xav793hr.js.map
