import{mr}from"./site-3hzw4f8j.js";import{ct}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class hx extends mr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function dx(){if(t)return;t=!0,o("FlowGraphBranchBlock",hx)}dx();
export{hx,dx};

//# debugId=D3AD06F257B43AD364756E2164756E21
//# sourceMappingURL=site-k51fg1nm.js.map
