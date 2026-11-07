import{$e}from"./site-ktydmw50.js";import{O}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Dm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",O,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Lm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Dm)}Lm();
export{Dm,Lm};

//# debugId=570F9C8676BDC14764756E2164756E21
//# sourceMappingURL=site-51g4p0qm.js.map
