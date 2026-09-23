import{Ys as a}from"./site-vc97e38v.js";import{ot as o}from"./site-rrva3mwb.js";import{hG as l}from"./site-qd0cy957.js";class r extends a{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",o)}_execute(e,p){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function s(){if(i)return;i=!0,l("FlowGraphFlipFlopBlock",r)}s();
export{r as op,s as pp};

//# debugId=B2A4576E0A7FFC7764756E2164756E21
//# sourceMappingURL=site-vmx10gna.js.map
