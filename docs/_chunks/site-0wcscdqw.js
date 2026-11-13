import{gr}from"./site-qyhmxwr1.js";import{ct}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class yx extends gr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function Tx(){if(t)return;t=!0,o("FlowGraphBranchBlock",yx)}Tx();
export{yx,Tx};

//# debugId=09094F3AA68AE75464756E2164756E21
//# sourceMappingURL=site-0wcscdqw.js.map
