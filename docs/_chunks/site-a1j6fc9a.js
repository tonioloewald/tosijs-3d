import{dr}from"./site-n1qmzpg8.js";import{lt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class C_ extends dr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",lt)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function E_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",C_)}E_();
export{C_,E_};

//# debugId=719A02294AE544AE64756E2164756E21
//# sourceMappingURL=site-a1j6fc9a.js.map
