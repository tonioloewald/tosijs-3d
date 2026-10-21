import{Ye}from"./site-nkyb6jj0.js";import{P}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class Cm extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",P,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Em(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Cm)}Em();
export{Cm,Em};

//# debugId=0F1BCE6065DF245C64756E2164756E21
//# sourceMappingURL=site-k3jmj3yn.js.map
