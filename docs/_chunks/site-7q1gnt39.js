import{Xt as A}from"./site-b7re062y.js";import{nu as z}from"./site-v2rprchq.js";import{sE as v}from"./site-c9kedmgh.js";class D extends A{constructor(b){super(b);this.condition=this.registerDataInput("condition",z),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(b){if(this.condition.getValue(b))this.onTrue._activateSignal(b);else this.onFalse._activateSignal(b)}getClassName(){return"FlowGraphBranchBlock"}}var q=!1;function H(){if(q)return;q=!0,v("FlowGraphBranchBlock",D)}H();
export{D as hr,H as ir};

//# debugId=84297D4D4E7010E964756E2164756E21
//# sourceMappingURL=site-7q1gnt39.js.map
