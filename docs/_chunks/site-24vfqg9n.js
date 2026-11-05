import{$e}from"./site-sxxg2v6h.js";import{O}from"./site-fszd7aez.js";class b0 extends $e{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",O),this.value=this.registerDataInput("value",O),this.result=this.registerDataOutput("result",O)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{b0};

//# debugId=685385E09D3D57BA64756E2164756E21
//# sourceMappingURL=site-24vfqg9n.js.map
