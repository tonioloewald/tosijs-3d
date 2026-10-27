import{Ye}from"./site-v7dfb6ky.js";import{P,Br}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class cm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Br),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function um(){if(n)return;n=!0,o("FlowGraphFunctionReference",cm)}um();
export{cm,um};

//# debugId=5F232A51808173C064756E2164756E21
//# sourceMappingURL=site-c2m9c34z.js.map
