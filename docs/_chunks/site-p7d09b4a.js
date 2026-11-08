import{$e}from"./site-2z9zdtr9.js";import{w,ct}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class xg extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",w),this.onFalse=this.registerDataInput("onFalse",w),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function bg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",xg)}bg();
export{xg,bg};

//# debugId=6F16D998784FFA8664756E2164756E21
//# sourceMappingURL=site-p7d09b4a.js.map
