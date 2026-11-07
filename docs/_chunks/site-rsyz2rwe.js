import{_u,$e,ci}from"./site-ktydmw50.js";import{Ye,O}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Tg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",O,e.type),this.value=this.registerDataOutput("value",O),this.index=this.registerDataInput("index",O,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=_u(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Cg(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",Tg)}Cg();
export{Tg,Cg};

//# debugId=62888340BCF4650064756E2164756E21
//# sourceMappingURL=site-rsyz2rwe.js.map
