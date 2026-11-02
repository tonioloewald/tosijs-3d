import{it,ci}from"./site-scdwvr9t.js";import{Qt}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class _x extends it{constructor(e){super(e);this.delayIndex=this.registerDataInput("delayIndex",Qt)}_execute(e,a){let r=ci(this.delayIndex.getValue(e));if(r<0||isNaN(r)||!isFinite(r))return this._reportError(e,"Invalid delay index");let t=e._getGlobalContextVariable("pendingDelays",[])[r];if(t)t.dispose();this.out._activateSignal(e)}getClassName(){return"FlowGraphCancelDelayBlock"}}var l=!1;function xx(){if(l)return;l=!0,o("FlowGraphCancelDelayBlock",_x)}xx();
export{_x,xx};

//# debugId=6605F302CE60466C64756E2164756E21
//# sourceMappingURL=site-f0qmm3k9.js.map
