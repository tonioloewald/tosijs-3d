import{Xe}from"./site-3hzw4f8j.js";import{O,Br}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class fm extends Xe{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Br),this.object=this.registerDataInput("object",O),this.context=this.registerDataInput("context",O,null),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function pm(){if(n)return;n=!0,o("FlowGraphFunctionReference",fm)}pm();
export{fm,pm};

//# debugId=BEBA97425086873164756E2164756E21
//# sourceMappingURL=site-dmy1767m.js.map
