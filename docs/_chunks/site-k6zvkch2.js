import{du as E}from"./site-pehed6st.js";import{ku as m,nu as z}from"./site-v2rprchq.js";import{sE as v}from"./site-c9kedmgh.js";class H extends E{constructor(b){super(b);this.condition=this.registerDataInput("condition",z),this.onTrue=this.registerDataInput("onTrue",m),this.onFalse=this.registerDataInput("onFalse",m),this.output=this.registerDataOutput("output",m)}_updateOutputs(b){let J=this.condition.getValue(b);this.output.setValue(J?this.onTrue.getValue(b):this.onFalse.getValue(b),b)}getClassName(){return"FlowGraphConditionalBlock"}}var q=!1;function I(){if(q)return;q=!0,v("FlowGraphConditionalBlock",H)}I();
export{H as Mo,I as No};

//# debugId=E78DB42E5EAEC96164756E2164756E21
//# sourceMappingURL=site-k6zvkch2.js.map
