import{Ws as i}from"./site-t0y6hvhw.js";import{mt as o}from"./site-bab0thfc.js";import{fG as r}from"./site-pcap36fe.js";class s extends i{constructor(e){super(e);this.condition=this.registerDataInput("condition",o),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphBranchBlock",s)}a();
export{s as Mr,a as Nr};

//# debugId=D63A04FB7F50A59764756E2164756E21
//# sourceMappingURL=site-h3pf1hhf.js.map
