import{pr}from"./site-d92hj336.js";import{ct}from"./site-q1pk93qz.js";import{o}from"./site-synvytjq.js";class ax extends pr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=244AE2A664032B8C64756E2164756E21
//# sourceMappingURL=site-enws3r88.js.map
