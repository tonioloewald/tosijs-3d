import{dr}from"./site-5mxcr40t.js";import{lt}from"./site-xahfg9zj.js";import{o}from"./site-cpxwd5wy.js";class ax extends dr{constructor(e){super(e);this.condition=this.registerDataInput("condition",lt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=A29A0F3EF73D222E64756E2164756E21
//# sourceMappingURL=site-p60s1nxg.js.map
