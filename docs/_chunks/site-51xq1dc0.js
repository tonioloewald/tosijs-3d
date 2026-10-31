import{mr}from"./site-3hzw4f8j.js";import{ct}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Ig extends mr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Og(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Ig)}Og();
export{Ig,Og};

//# debugId=ED368AE6FC3DD3F164756E2164756E21
//# sourceMappingURL=site-51xq1dc0.js.map
