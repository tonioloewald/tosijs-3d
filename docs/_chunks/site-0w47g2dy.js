import{ct as s}from"./site-vtjqk0se.js";import{jt as o,mt as r}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class a extends s{constructor(t){super(t);this.condition=this.registerDataInput("condition",r),this.onTrue=this.registerDataInput("onTrue",o),this.onFalse=this.registerDataInput("onFalse",o),this.output=this.registerDataOutput("output",o)}_updateOutputs(t){let l=this.condition.getValue(t);this.output.setValue(l?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function n(){if(e)return;e=!0,i("FlowGraphConditionalBlock",a)}n();
export{a as Yo,n as Zo};

//# debugId=122203C9E8C1CDD264756E2164756E21
//# sourceMappingURL=site-0w47g2dy.js.map
