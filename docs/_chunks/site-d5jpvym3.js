import{gr}from"./site-3t3g319r.js";import{ct}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class yx extends gr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function Tx(){if(t)return;t=!0,o("FlowGraphBranchBlock",yx)}Tx();
export{yx,Tx};

//# debugId=09094F3AA68AE75464756E2164756E21
//# sourceMappingURL=site-d5jpvym3.js.map
