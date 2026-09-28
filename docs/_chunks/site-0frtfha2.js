import{Ye}from"./site-c6g1b76s.js";import{I,Lr}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class sm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Lr),this.object=this.registerDataInput("object",I),this.context=this.registerDataInput("context",I,null),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let o=this.functionName.getValue(t),r=this.object.getValue(t),n=this.context.getValue(t);if(r&&o){let e=r[o];if(e&&typeof e==="function")this.output.setValue(e.bind(n),t)}}getClassName(){return"FlowGraphFunctionReference"}}var i=!1;function nm(){if(i)return;i=!0,a("FlowGraphFunctionReference",sm)}nm();
export{sm,nm};

//# debugId=6E384B4911919E6C64756E2164756E21
//# sourceMappingURL=site-0frtfha2.js.map
