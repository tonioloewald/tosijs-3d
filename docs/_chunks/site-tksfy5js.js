import{mr}from"./site-sxxg2v6h.js";import{ct}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class wg extends mr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Pg(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",wg)}Pg();
export{wg,Pg};

//# debugId=B107E3CDE4445CFA64756E2164756E21
//# sourceMappingURL=site-tksfy5js.js.map
