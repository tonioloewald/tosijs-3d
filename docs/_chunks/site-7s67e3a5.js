import{Ye}from"./site-8x68wnvm.js";import{P}from"./site-a1xnpyy6.js";import{o}from"./site-39snrr7g.js";class Cm extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",P,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Em(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Cm)}Em();
export{Cm,Em};

//# debugId=0F1BCE6065DF245C64756E2164756E21
//# sourceMappingURL=site-7s67e3a5.js.map
