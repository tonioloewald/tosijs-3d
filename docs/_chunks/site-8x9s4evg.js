import{Ws as a}from"./site-t0y6hvhw.js";import{mt as o}from"./site-bab0thfc.js";import{fG as l}from"./site-pcap36fe.js";class r extends a{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",o)}_execute(e,p){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function s(){if(i)return;i=!0,l("FlowGraphFlipFlopBlock",r)}s();
export{r as mp,s as np};

//# debugId=C8D2C16B9B895C3F64756E2164756E21
//# sourceMappingURL=site-8x9s4evg.js.map
