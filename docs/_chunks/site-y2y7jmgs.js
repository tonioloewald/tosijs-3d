import{Ye}from"./site-kqwawvd6.js";import{P,Dr}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class hm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Dr),this.object=this.registerDataInput("object",P),this.context=this.registerDataInput("context",P,null),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function fm(){if(n)return;n=!0,o("FlowGraphFunctionReference",hm)}fm();
export{hm,fm};

//# debugId=24433834529E445664756E2164756E21
//# sourceMappingURL=site-y2y7jmgs.js.map
