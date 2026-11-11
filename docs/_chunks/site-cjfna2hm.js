import{gr}from"./site-j6ranrbs.js";import{ct}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class _x extends gr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function xx(){if(t)return;t=!0,o("FlowGraphBranchBlock",_x)}xx();
export{_x,xx};

//# debugId=2B90649FBB91537564756E2164756E21
//# sourceMappingURL=site-cjfna2hm.js.map
