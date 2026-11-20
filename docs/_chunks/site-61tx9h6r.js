import{it}from"./site-x0v5x8t1.js";import{Ye,qt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Vg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",qt),this.executionCount=this.registerDataOutput("executionCount",qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function zg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Vg)}zg();
export{Vg,zg};

//# debugId=B03F7CC8A5058E8764756E2164756E21
//# sourceMappingURL=site-61tx9h6r.js.map
