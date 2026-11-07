import{$e}from"./site-ktydmw50.js";import{O,Fr}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class xm extends $e{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Fr),this.object=this.registerDataInput("object",O),this.context=this.registerDataInput("context",O,null),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function bm(){if(n)return;n=!0,o("FlowGraphFunctionReference",xm)}bm();
export{xm,bm};

//# debugId=200A9B7CEB1407C064756E2164756E21
//# sourceMappingURL=site-bvgw846x.js.map
