import{hr}from"./site-c6g1b76s.js";import{ut}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class b_ extends hr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ut)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function S_(){if(i)return;i=!0,a("FlowGraphFlipFlopBlock",b_)}S_();
export{b_,S_};

//# debugId=ED79EADB047E2A2964756E2164756E21
//# sourceMappingURL=site-gyyra2m5.js.map
