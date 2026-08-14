import{Ut as z}from"./site-40a1yrg8.js";import{mu as y}from"./site-v2rprchq.js";import{sE as v}from"./site-c9kedmgh.js";class A extends z{constructor(b){super(b);this.count=this.registerDataOutput("count",y),this.reset=this._registerSignalInput("reset")}_execute(b,H){if(H===this.reset){b._setExecutionVariable(this,"count",0),this.count.setValue(0,b);return}let d=b._getExecutionVariable(this,"count",0)+1;b._setExecutionVariable(this,"count",d),this.count.setValue(d,b),this.out._activateSignal(b)}getClassName(){return"FlowGraphCallCounterBlock"}}var q=!1;function D(){if(q)return;q=!0,v("FlowGraphCallCounterBlock",A)}D();
export{A as qr,D as rr};

//# debugId=FFDBEB6B7FA5919964756E2164756E21
//# sourceMappingURL=site-yb497137.js.map
