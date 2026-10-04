import{pu,Ye,ai}from"./site-yk445q08.js";import{We,I}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class __ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",I,e.type),this.value=this.registerDataOutput("value",I),this.index=this.registerDataInput("index",I,new We(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function g_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",__)}g_();
export{__,g_};

//# debugId=247F8D59C58B6E8664756E2164756E21
//# sourceMappingURL=site-1zh66jpz.js.map
