import{Qi}from"./site-z8mqhr1b.js";import{nt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Vm extends Qi{constructor(e){super(e);this.condition=this.registerDataInput("condition",nt),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function Gm(){if(t)return;t=!0,a("FlowGraphBranchBlock",Vm)}Gm();
export{Vm,Gm};

//# debugId=8CF568279F5F259C64756E2164756E21
//# sourceMappingURL=site-7mmvef9x.js.map
