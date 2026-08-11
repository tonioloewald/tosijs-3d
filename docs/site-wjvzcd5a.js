import{Xt as A}from"./site-n4wzvw99.js";import{nu as z}from"./site-5mc4escc.js";import{sE as v}from"./site-tvqrtn5a.js";class D extends A{constructor(b){super(b);this.condition=this.registerDataInput("condition",z),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(b){if(this.condition.getValue(b))this.onTrue._activateSignal(b);else this.onFalse._activateSignal(b)}getClassName(){return"FlowGraphBranchBlock"}}var q=!1;function H(){if(q)return;q=!0,v("FlowGraphBranchBlock",D)}H();
export{D as hr,H as ir};

//# debugId=B879AC44834D477864756E2164756E21
//# sourceMappingURL=site-wjvzcd5a.js.map
