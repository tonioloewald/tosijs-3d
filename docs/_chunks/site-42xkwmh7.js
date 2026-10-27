import{mr}from"./site-v7dfb6ky.js";import{ct}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class ax extends mr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=C6F0DE61C8420CF564756E2164756E21
//# sourceMappingURL=site-42xkwmh7.js.map
