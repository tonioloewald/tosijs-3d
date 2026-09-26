import{ze}from"./site-z8mqhr1b.js";import{R,_r}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Hd extends ze{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",_r),this.object=this.registerDataInput("object",R),this.context=this.registerDataInput("context",R,null),this.output=this.registerDataOutput("output",R)}_updateOutputs(t){let o=this.functionName.getValue(t),r=this.object.getValue(t),n=this.context.getValue(t);if(r&&o){let e=r[o];if(e&&typeof e==="function")this.output.setValue(e.bind(n),t)}}getClassName(){return"FlowGraphFunctionReference"}}var i=!1;function Xd(){if(i)return;i=!0,a("FlowGraphFunctionReference",Hd)}Xd();
export{Hd,Xd};

//# debugId=C43FDC2C87045B1764756E2164756E21
//# sourceMappingURL=site-ta6m09xw.js.map
