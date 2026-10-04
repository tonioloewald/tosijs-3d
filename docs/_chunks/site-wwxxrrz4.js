import{hr}from"./site-yk445q08.js";import{ut}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class A_ extends hr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ut)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function R_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",A_)}R_();
export{A_,R_};

//# debugId=0BD3F52DB3819A1564756E2164756E21
//# sourceMappingURL=site-wwxxrrz4.js.map
