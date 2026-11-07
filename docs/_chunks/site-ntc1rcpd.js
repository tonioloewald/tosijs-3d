import{gr}from"./site-ktydmw50.js";import{ct}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class gx extends gr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function _x(){if(t)return;t=!0,o("FlowGraphBranchBlock",gx)}_x();
export{gx,_x};

//# debugId=E9E97615E1CC42AE64756E2164756E21
//# sourceMappingURL=site-ntc1rcpd.js.map
