import{pr}from"./site-4r99kqsd.js";import{ct}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class C_ extends pr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function E_(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",C_)}E_();
export{C_,E_};

//# debugId=8BEF849D9E02D84A64756E2164756E21
//# sourceMappingURL=site-xbxkv4q2.js.map
