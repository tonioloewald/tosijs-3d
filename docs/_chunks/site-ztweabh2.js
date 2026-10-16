import{Ye}from"./site-e0k6q2az.js";import{P,Lr}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class cm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Lr),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function um(){if(n)return;n=!0,o("FlowGraphFunctionReference",cm)}um();
export{cm,um};

//# debugId=5B0B99CFAFA44BD764756E2164756E21
//# sourceMappingURL=site-ztweabh2.js.map
