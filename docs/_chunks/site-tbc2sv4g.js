import{Qe,Jt}from"./site-z8mqhr1b.js";import{Vt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Wm extends Qe{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Vt)}_execute(e,i){let r=Jt(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function Hm(){if(l)return;l=!0,a("FlowGraphCancelDelayBlock",Wm)}Hm();
export{Wm,Hm};

//# debugId=6F8DAFC63ECF972E64756E2164756E21
//# sourceMappingURL=site-tbc2sv4g.js.map
