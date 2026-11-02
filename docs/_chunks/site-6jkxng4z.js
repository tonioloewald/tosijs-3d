import{mr}from"./site-scdwvr9t.js";import{ct}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class fx extends mr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function px(){if(t)return;t=!0,o("FlowGraphBranchBlock",fx)}px();
export{fx,px};

//# debugId=5BE584118EC88C6364756E2164756E21
//# sourceMappingURL=site-6jkxng4z.js.map
