import{Ys as i}from"./site-vc97e38v.js";import{ot as o}from"./site-rrva3mwb.js";import{hG as r}from"./site-qd0cy957.js";class s extends i{constructor(e){super(e);this.condition=this.registerDataInput("condition",o),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function a(){if(t)return;t=!0,r("FlowGraphBranchBlock",s)}a();
export{s as Or,a as Pr};

//# debugId=8D8E76782F873D2264756E2164756E21
//# sourceMappingURL=site-mev2p0vq.js.map
