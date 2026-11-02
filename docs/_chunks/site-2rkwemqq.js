import{mr}from"./site-tabsjb83.js";import{ct}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class Pg extends mr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function wg(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Pg)}wg();
export{Pg,wg};

//# debugId=9CFBB9105BEE038D64756E2164756E21
//# sourceMappingURL=site-2rkwemqq.js.map
