import{$e}from"./site-ktydmw50.js";import{O,ct}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class _g extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",O),this.onFalse=this.registerDataInput("onFalse",O),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function xg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",_g)}xg();
export{_g,xg};

//# debugId=024218C1EA567EAE64756E2164756E21
//# sourceMappingURL=site-xekm1ap1.js.map
