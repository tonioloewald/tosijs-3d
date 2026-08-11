import{du as E}from"./site-037v9pkv.js";import{ku as m,nu as z}from"./site-5mc4escc.js";import{sE as v}from"./site-tvqrtn5a.js";class H extends E{constructor(b){super(b);this.condition=this.registerDataInput("condition",z),this.onTrue=this.registerDataInput("onTrue",m),this.onFalse=this.registerDataInput("onFalse",m),this.output=this.registerDataOutput("output",m)}_updateOutputs(b){let J=this.condition.getValue(b);this.output.setValue(J?this.onTrue.getValue(b):this.onFalse.getValue(b),b)}getClassName(){return"FlowGraphConditionalBlock"}}var q=!1;function I(){if(q)return;q=!0,v("FlowGraphConditionalBlock",H)}I();
export{H as Mo,I as No};

//# debugId=A420A26975CC298364756E2164756E21
//# sourceMappingURL=site-sx7qjg5b.js.map
