import{it}from"./site-x0v5x8t1.js";import{V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Ox extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function Px(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",Ox)}Px();
export{Ox,Px};

//# debugId=2F985F7E5D63758F64756E2164756E21
//# sourceMappingURL=site-1zedvgxx.js.map
