import{pr}from"./site-nkyb6jj0.js";import{ct}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class ax extends pr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=244AE2A664032B8C64756E2164756E21
//# sourceMappingURL=site-2yan8zy9.js.map
