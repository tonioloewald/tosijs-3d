import{dr}from"./site-rhk48zyv.js";import{lt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class ax extends dr{constructor(e){super(e);this.condition=this.registerDataInput("condition",lt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=A29A0F3EF73D222E64756E2164756E21
//# sourceMappingURL=site-ar38g35w.js.map
