import{pu,Ye,li}from"./site-v7dfb6ky.js";import{He,P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class pg extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new He(li(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,li(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function mg(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",pg)}mg();
export{pg,mg};

//# debugId=7AB7A948B07B26F464756E2164756E21
//# sourceMappingURL=site-7cjy03gk.js.map
