import{gr}from"./site-x0v5x8t1.js";import{ct}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Cx extends gr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ct),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function Ax(){if(t)return;t=!0,o("FlowGraphBranchBlock",Cx)}Ax();
export{Cx,Ax};

//# debugId=8D050B1E1E0F572E64756E2164756E21
//# sourceMappingURL=site-e3ejd8n4.js.map
