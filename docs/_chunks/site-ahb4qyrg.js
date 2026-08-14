import{du as q}from"./site-pehed6st.js";import{ku as d}from"./site-v2rprchq.js";class C extends q{constructor(b){super(b);this.config=b,this.executionFunction=this.registerDataInput("function",d),this.value=this.registerDataInput("value",d),this.result=this.registerDataOutput("result",d)}_updateOutputs(b){let m=this.executionFunction.getValue(b),z=this.value.getValue(b);if(m)this.result.setValue(m(z,b),b)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{C as pn};

//# debugId=1DEE749F0E155D0E64756E2164756E21
//# sourceMappingURL=site-ahb4qyrg.js.map
