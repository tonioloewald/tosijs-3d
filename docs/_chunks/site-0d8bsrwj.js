import{pu,Ye,ai}from"./site-4jsq7n1s.js";import{We,P}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class __ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new We(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function g_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",__)}g_();
export{__,g_};

//# debugId=DCA539BA981FF4F564756E2164756E21
//# sourceMappingURL=site-0d8bsrwj.js.map
