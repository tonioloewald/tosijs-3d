import{fr}from"./site-23z3qe8v.js";import{lt}from"./site-xp6e2pbe.js";import{o}from"./site-6fgvbfwz.js";class cx extends fr{constructor(e){super(e);this.condition=this.registerDataInput("condition",lt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function ux(){if(t)return;t=!0,o("FlowGraphBranchBlock",cx)}ux();
export{cx,ux};

//# debugId=65D556B5205DCCE864756E2164756E21
//# sourceMappingURL=site-j5xge3qq.js.map
