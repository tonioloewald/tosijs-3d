import{$e}from"./site-j6ranrbs.js";import{w,ct}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class xg extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",w),this.onFalse=this.registerDataInput("onFalse",w),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function bg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",xg)}bg();
export{xg,bg};

//# debugId=6F16D998784FFA8664756E2164756E21
//# sourceMappingURL=site-3h0t6gzs.js.map
