import{ur}from"./site-5tw2831p.js";import{ut}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class b_ extends ur{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ut)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function S_(){if(i)return;i=!0,a("FlowGraphFlipFlopBlock",b_)}S_();
export{b_,S_};

//# debugId=0AF1182828478B1564756E2164756E21
//# sourceMappingURL=site-zj3k0ydh.js.map
