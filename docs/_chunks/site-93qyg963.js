import{pu,Ye,ai}from"./site-kqwawvd6.js";import{We,P}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class __ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new We(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function g_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",__)}g_();
export{__,g_};

//# debugId=DCA539BA981FF4F564756E2164756E21
//# sourceMappingURL=site-93qyg963.js.map
