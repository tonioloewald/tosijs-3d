import{hr}from"./site-yk445q08.js";import{ut}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class cx extends hr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ut),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function ux(){if(t)return;t=!0,o("FlowGraphBranchBlock",cx)}ux();
export{cx,ux};

//# debugId=0A0336DCF6CE4B0964756E2164756E21
//# sourceMappingURL=site-febftv2s.js.map
