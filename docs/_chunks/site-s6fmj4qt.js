import{fr}from"./site-20s7pn47.js";import{ut}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class A_ extends fr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ut)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function R_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",A_)}R_();
export{A_,R_};

//# debugId=66474DB07826C1DE64756E2164756E21
//# sourceMappingURL=site-s6fmj4qt.js.map
