import{fr}from"./site-4jsq7n1s.js";import{lt}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class cx extends fr{constructor(e){super(e);this.condition=this.registerDataInput("condition",lt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function ux(){if(t)return;t=!0,o("FlowGraphBranchBlock",cx)}ux();
export{cx,ux};

//# debugId=65D556B5205DCCE864756E2164756E21
//# sourceMappingURL=site-dj2t9qj9.js.map
