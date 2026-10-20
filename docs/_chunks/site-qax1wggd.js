import{pr}from"./site-4r99kqsd.js";import{ct}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class ax extends pr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function lx(){if(t)return;t=!0,o("FlowGraphBranchBlock",ax)}lx();
export{ax,lx};

//# debugId=244AE2A664032B8C64756E2164756E21
//# sourceMappingURL=site-qax1wggd.js.map
