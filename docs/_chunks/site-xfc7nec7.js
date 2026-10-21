import{Ye}from"./site-nkyb6jj0.js";import{P,Nr}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class cm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Nr),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function um(){if(n)return;n=!0,o("FlowGraphFunctionReference",cm)}um();
export{cm,um};

//# debugId=BFC9F1FD2C60152764756E2164756E21
//# sourceMappingURL=site-xfc7nec7.js.map
