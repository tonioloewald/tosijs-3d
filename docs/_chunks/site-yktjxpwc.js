import{Xe}from"./site-3hzw4f8j.js";import{O,ct}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class dg extends Xe{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",O),this.onFalse=this.registerDataInput("onFalse",O),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function fg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",dg)}fg();
export{dg,fg};

//# debugId=4D0223B1E71CF12664756E2164756E21
//# sourceMappingURL=site-yktjxpwc.js.map
