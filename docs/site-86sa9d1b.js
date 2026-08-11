import{du as q}from"./site-037v9pkv.js";import{ku as d}from"./site-5mc4escc.js";class C extends q{constructor(b){super(b);this.config=b,this.executionFunction=this.registerDataInput("function",d),this.value=this.registerDataInput("value",d),this.result=this.registerDataOutput("result",d)}_updateOutputs(b){let m=this.executionFunction.getValue(b),z=this.value.getValue(b);if(m)this.result.setValue(m(z,b),b)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{C as pn};

//# debugId=30F4D9FBACEB11C464756E2164756E21
//# sourceMappingURL=site-86sa9d1b.js.map
