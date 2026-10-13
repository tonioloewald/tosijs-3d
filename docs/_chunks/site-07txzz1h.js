import{fr}from"./site-2t6wdrsc.js";import{lt}from"./site-sy6g2f03.js";import{o}from"./site-pz63xeyn.js";class A_ extends fr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",lt)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function R_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",A_)}R_();
export{A_,R_};

//# debugId=E8F359DEFEB7A12564756E2164756E21
//# sourceMappingURL=site-07txzz1h.js.map
