import{fr}from"./site-20s7pn47.js";import{ut}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class cx extends fr{constructor(e){super(e);this.condition=this.registerDataInput("condition",ut),this.onTrue=this._registerSignalOutput("onTrue"),this.onFalse=this._registerSignalOutput("onFalse")}_execute(e){if(this.condition.getValue(e))this.onTrue._activateSignal(e);else this.onFalse._activateSignal(e)}getClassName(){return"FlowGraphBranchBlock"}}var t=!1;function ux(){if(t)return;t=!0,o("FlowGraphBranchBlock",cx)}ux();
export{cx,ux};

//# debugId=A35A043F18AE13E164756E2164756E21
//# sourceMappingURL=site-mq2ywnhd.js.map
