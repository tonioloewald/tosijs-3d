import{fr}from"./site-kqwawvd6.js";import{lt}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class cx extends fr{constructor(e){super(e);this.condition=this.registerDataInput("condition",lt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function ux(){if(t)return;t=!0,o("FlowGraphBranchBlock",cx)}ux();
export{cx,ux};

//# debugId=65D556B5205DCCE864756E2164756E21
//# sourceMappingURL=site-jet7pxgd.js.map
