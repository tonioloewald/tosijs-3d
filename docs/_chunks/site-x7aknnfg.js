import{Vs as s}from"./site-gda1mzz6.js";import{nt as i}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class u extends s{constructor(t){super(t);this.count=this.registerDataOutput("count",i),this.reset=this._registerSignalInput("reset")}_execute(t,l){if(l===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function a(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",u)}a();
export{u as gp,a as hp};

//# debugId=CA1E04EC9CE387C264756E2164756E21
//# sourceMappingURL=site-x7aknnfg.js.map
