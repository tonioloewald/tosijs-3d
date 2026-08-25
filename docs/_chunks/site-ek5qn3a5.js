import{Xt as i}from"./site-fss7f8pw.js";import{nu as o}from"./site-86tpqddf.js";import{sE as r}from"./site-yf4sr5jd.js";class s extends i{constructor(e){super(e);this.condition=this.registerDataInput("condition",o),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphBranchBlock",s)}a();
export{s as hr,a as ir};

//# debugId=241030B63375D13264756E2164756E21
//# sourceMappingURL=site-ek5qn3a5.js.map
