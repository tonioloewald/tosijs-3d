import{Ye}from"./site-rhk48zyv.js";import{P,Lr}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class cm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Lr),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function um(){if(n)return;n=!0,o("FlowGraphFunctionReference",cm)}um();
export{cm,um};

//# debugId=5B0B99CFAFA44BD764756E2164756E21
//# sourceMappingURL=site-9z1pj46f.js.map
