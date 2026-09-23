import{et as s}from"./site-gyw9fqwj.js";import{lt as o,ot as r}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class a extends s{constructor(t){super(t);this.condition=this.registerDataInput("condition",r),this.onTrue=this.registerDataInput("onTrue",o),this.onFalse=this.registerDataInput("onFalse",o),this.output=this.registerDataOutput("output",o)}_updateOutputs(t){let l=this.condition.getValue(t);this.output.setValue(l?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function n(){if(e)return;e=!0,i("FlowGraphConditionalBlock",a)}n();
export{a as _o,n as $o};

//# debugId=C70C5BB131D501CE64756E2164756E21
//# sourceMappingURL=site-kqxrk1bs.js.map
