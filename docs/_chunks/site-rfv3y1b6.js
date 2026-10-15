import{dr}from"./site-rhk48zyv.js";import{lt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class C_ extends dr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",lt)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function E_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",C_)}E_();
export{C_,E_};

//# debugId=719A02294AE544AE64756E2164756E21
//# sourceMappingURL=site-rfv3y1b6.js.map
