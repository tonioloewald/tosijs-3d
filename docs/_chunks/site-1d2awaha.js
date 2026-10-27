import{mr}from"./site-v7dfb6ky.js";import{ct}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Cg extends mr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Ag(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Cg)}Ag();
export{Cg,Ag};

//# debugId=C6421AA7F8917D4364756E2164756E21
//# sourceMappingURL=site-1d2awaha.js.map
