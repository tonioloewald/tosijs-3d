import{Br as s}from"./site-d8tyq8af.js";import{Ts as o}from"./site-nv8skz8z.js";import{wt as i}from"./site-bab0thfc.js";import{fG as a}from"./site-pcap36fe.js";class n extends o{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",i)}_execute(e,c){let r=s(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function p(){if(l)return;l=!0,a("FlowGraphCancelDelayBlock",n)}p();
export{n as cp,p as dp};

//# debugId=140FB9998F468E1364756E2164756E21
//# sourceMappingURL=site-nt26m0pt.js.map
