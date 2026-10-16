import{Ye}from"./site-n1qmzpg8.js";import{P,Lr}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class cm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Lr),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function um(){if(n)return;n=!0,o("FlowGraphFunctionReference",cm)}um();
export{cm,um};

//# debugId=5B0B99CFAFA44BD764756E2164756E21
//# sourceMappingURL=site-hhcxqxg7.js.map
