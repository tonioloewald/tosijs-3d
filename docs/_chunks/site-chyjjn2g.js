import{$e}from"./site-tabsjb83.js";import{O,ct}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class pg extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",O),this.onFalse=this.registerDataInput("onFalse",O),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function mg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",pg)}mg();
export{pg,mg};

//# debugId=7DA15EF188C6E68A64756E2164756E21
//# sourceMappingURL=site-chyjjn2g.js.map
