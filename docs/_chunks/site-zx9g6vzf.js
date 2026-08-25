import{du as s}from"./site-e325gqfj.js";import{ku as o,nu as r}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class a extends s{constructor(t){super(t);this.condition=this.registerDataInput("condition",r),this.onTrue=this.registerDataInput("onTrue",o),this.onFalse=this.registerDataInput("onFalse",o),this.output=this.registerDataOutput("output",o)}_updateOutputs(t){let l=this.condition.getValue(t);this.output.setValue(l?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function n(){if(e)return;e=!0,i("FlowGraphConditionalBlock",a)}n();
export{a as Mo,n as No};

//# debugId=C95193ED813890A664756E2164756E21
//# sourceMappingURL=site-zx9g6vzf.js.map
