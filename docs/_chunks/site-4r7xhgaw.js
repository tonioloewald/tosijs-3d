import{Ye}from"./site-5tw2831p.js";import{I,Dr}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class sm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Dr),this.object=this.registerDataInput("object",I),this.context=this.registerDataInput("context",I,null),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let o=this.functionName.getValue(t),r=this.object.getValue(t),n=this.context.getValue(t);if(r&&o){let e=r[o];if(e&&typeof e==="function")this.output.setValue(e.bind(n),t)}}getClassName(){return"FlowGraphFunctionReference"}}var i=!1;function nm(){if(i)return;i=!0,a("FlowGraphFunctionReference",sm)}nm();
export{sm,nm};

//# debugId=E6D6DAAA1FED07A664756E2164756E21
//# sourceMappingURL=site-4r7xhgaw.js.map
