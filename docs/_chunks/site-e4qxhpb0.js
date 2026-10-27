import{Ye}from"./site-v7dfb6ky.js";import{P,ct}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class lg extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function cg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",lg)}cg();
export{lg,cg};

//# debugId=E958F7320435206564756E2164756E21
//# sourceMappingURL=site-e4qxhpb0.js.map
