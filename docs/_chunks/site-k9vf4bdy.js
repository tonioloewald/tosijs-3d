import{Dr as s}from"./site-rpgg5q6n.js";import{Vs as o}from"./site-gda1mzz6.js";import{yt as i}from"./site-rrva3mwb.js";import{hG as a}from"./site-qd0cy957.js";class n extends o{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",i)}_execute(e,c){let r=s(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function p(){if(l)return;l=!0,a("FlowGraphCancelDelayBlock",n)}p();
export{n as ep,p as fp};

//# debugId=C54200EF531DEEC964756E2164756E21
//# sourceMappingURL=site-k9vf4bdy.js.map
