import{_u,Xe,li}from"./site-3hzw4f8j.js";import{He,O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class xg extends Xe{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",O,e.type),this.value=this.registerDataOutput("value",O),this.index=this.registerDataInput("index",O,new He(li(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=_u(e.assetsContext,s,li(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function bg(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",xg)}bg();
export{xg,bg};

//# debugId=3C0D36DEFCD3778964756E2164756E21
//# sourceMappingURL=site-aaqc3ymt.js.map
