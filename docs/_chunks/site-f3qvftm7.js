import{hr}from"./site-c6g1b76s.js";import{ut}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class J_ extends hr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ut),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function eg(){if(t)return;t=!0,a("FlowGraphBranchBlock",J_)}eg();
export{J_,eg};

//# debugId=BD3FE4923B10A02764756E2164756E21
//# sourceMappingURL=site-f3qvftm7.js.map
