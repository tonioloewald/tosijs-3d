import{du as c}from"./site-e325gqfj.js";import{ku as e,lu as u}from"./site-86tpqddf.js";import{sE as s}from"./site-yf4sr5jd.js";class a extends c{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",u),this.object=this.registerDataInput("object",e),this.context=this.registerDataInput("context",e,null),this.output=this.registerDataOutput("output",e)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),f=this.context.getValue(t);if(i&&r){let o=i[r];if(o&&typeof o==="function")this.output.setValue(o.bind(f),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function p(){if(n)return;n=!0,s("FlowGraphFunctionReference",a)}p();
export{a as sn,p as tn};

//# debugId=7332D19C886D041764756E2164756E21
//# sourceMappingURL=site-xrejywn1.js.map
