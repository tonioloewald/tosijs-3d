import{ur}from"./site-5tw2831p.js";import{ut}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class J_ extends ur{constructor(e){super(e);this.condition=this.registerDataInput("condition",ut),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function eg(){if(t)return;t=!0,a("FlowGraphBranchBlock",J_)}eg();
export{J_,eg};

//# debugId=BDFC2400FEC5490564756E2164756E21
//# sourceMappingURL=site-b3e5j295.js.map
